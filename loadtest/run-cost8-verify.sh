#!/bin/bash
# Verification sweep @ bcrypt cost 8 (TEST-ONLY, NEW FILE).
# Full sign-in flow (k6) + isolated components (node harness) at 10/25/50/100.
# Same stages/shape at every level; results to NEW dir (no overwrites).
# Secrets via env/files only; never printed or written to results.
set -u
cd "$(dirname "$0")/.." || exit 1
RDIR="loadtest/test-results-cost8-20261012"
mkdir -p "$RDIR"
export K6_BASE_URL="${K6_BASE_URL:-http://localhost:5000}"
export K6_COST8_EMAIL="${K6_COST8_EMAIL:-k6-cost8@hostel.local}"
export K6_COST8_PASSWORD="$(cat /tmp/k6cost8pw)"
START_ALL=$(date -u +%FT%TZ)
echo "sweep start=$START_ALL" | tee "$RDIR/sweep-config.txt"
{
  echo "endpoint=$K6_BASE_URL/api/session account=$K6_COST8_EMAIL"
  echo "bcrypt_cost=8 (stored-hash prefix $(cat /tmp/k6cost8hash | cut -c1-7), rounds=$(node -e "console.log(require('/home/new-user/hostel-management/backend/node_modules/bcrypt/bcrypt.js').getRounds(require('fs').readFileSync('/tmp/k6cost8hash','utf8').trim()))"))"
  echo "app_code_bcrypt_default=10 (BCRYPT_ROUNDS env=${BCRYPT_ROUNDS:-<unset>}); compare cost comes from stored hash, so measured path is cost 8"
  echo "k6_stages=ramp15s/hold60s/down10s sleep=0.5s timeout=15s"
  echo "components=closed-loop fixed-concurrency, 5s warmup discarded + 30s measure, no think time"
  echo "git_rev=$(git rev-parse --short HEAD 2>/dev/null) backend_pid=$(pgrep -f 'backend/dist/app[.]js' | head -n1)"
  echo "cpu=$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs) cores=$(nproc)"
  grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | xargs > /dev/null
  free -m | head -2; mysql --version 2>/dev/null; node --version; k6 version 2>&1 | head -1
} >> "$RDIR/sweep-config.txt" 2>&1

for VU in 10 25 50 100; do
  echo "=== FULL sign-in VU=$VU $(date -u +%FT%TZ) ===" | tee -a "$RDIR/sweep-config.txt"
  python3 loadtest/phaseB-sampler.py --out "$RDIR/cpu-full-signin-${VU}vu.csv" --interval 2 &
  SAMPID=$!
  sleep 3
  K6_VUS="$VU" k6 run --summary-export "$RDIR/full-signin-${VU}vu-k6summary.json" \
    loadtest/cost8-verify-signin.js 2>&1 | tee "$RDIR/full-signin-${VU}vu-k6stdout.log"
  kill "$SAMPID" 2>/dev/null; wait "$SAMPID" 2>/dev/null
  sleep 5
  for COMP in db_lookup bcrypt_compare jwt_sign; do
    echo "=== COMPONENT $COMP workers=$VU $(date -u +%FT%TZ) ===" | tee -a "$RDIR/sweep-config.txt"
    python3 loadtest/phaseB-sampler.py --out "$RDIR/cpu-component-${COMP}-${VU}vu.csv" --interval 2 &
    SAMPID=$!
    sleep 3
    node loadtest/cost8-verify-components.mjs --component "$COMP" --workers "$VU" \
      --warmup 5 --measure 30 --out "$RDIR/component-${COMP}-${VU}vu.json" 2>&1 | tee "$RDIR/component-${COMP}-${VU}vu.log"
    kill "$SAMPID" 2>/dev/null; wait "$SAMPID" 2>/dev/null
    sleep 5
  done
done

echo "=== invalid-credentials probe (separate, not mixed) $(date -u +%FT%TZ) ===" | tee -a "$RDIR/sweep-config.txt"
for i in 1 2 3 4 5; do
  curl -s -m 15 -o /dev/null -w "invalid_try$i http=%{http_code} time=%{time_total}s\n" \
    -X POST "$K6_BASE_URL/api/session" -H 'Content-Type: application/json' \
    -d '{"email":"'"$K6_COST8_EMAIL"'","password":"wrong-password-xyz"}' | tee -a "$RDIR/invalid-credentials-probe.log"
done
echo "sweep end=$(date -u +%FT%TZ)" | tee -a "$RDIR/sweep-config.txt"
echo "SWEEP DONE — results in $RDIR (no prior files overwritten)"
