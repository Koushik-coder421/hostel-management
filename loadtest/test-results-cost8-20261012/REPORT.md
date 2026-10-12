# Sign-in load verification @ bcrypt cost 8 — 2026-10-12 (sweep 05:42–05:57 UTC)

## Config
- Endpoint: `POST http://localhost:5000/api/session` (routes/index.ts:33 → loginStaff).
- Account: isolated `k6-cost8@hostel.local` (MAINTENANCE_STAFF, ACTIVE), hash `$2b$08$`, rounds verified = 8.
  Production code default is cost 10 and all pre-existing hashes are `$2b$10$` (untouched).
  Compare cost comes from the stored hash, so the measured path is genuinely cost 8.
- k6: stages ramp15s/hold60s/down10s, sleep 0.5s, timeout 15s. VUs = concurrent users, not RPS.
- Components: isolated closed-loop harnesses, 5s warmup discarded + 30s measure, no think time.
  NOT summable to end-to-end. No Server-Timing instrumentation exists in the prod build.
- Box: Intel i5-6500 (4 cores), 7.3GB RAM, MySQL 8.4.11, Node v24.20.0, k6 v0.55.0, backend pid 5667.
- CPU figures: process values = % of total machine capacity; core values = true 0–100% busy per core.

## B. Full sign-in latency (all valid logins; the 1 "failed" per run is the 401 setup probe)

| VUs | p50 (ms) | p90 (ms) | p95 (ms) | Avg (ms) | Min | Max | Total | OK | RPS | Error rate | Timeouts |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 60.5 | 67.9 | 72.7 | 56.9 | 15.4 | 104.5 | 1447 | 1446 | 17.0 | 0.00% | 0 |
| 25 | 60.7 | 75.6 | 83.9 | 60.7 | 15.5 | 127.9 | 3582 | 3581 | 42.0 | 0.00% | 0 |
| 50 | 61.3 | 76.0 | 86.3 | 61.4 | 14.7 | 269.5 | 7149 | 7148 | 83.9 | 0.00% | 0 |
| 100 | 17.4 | 48.6 | 79.1 | 26.1 | 14.5 | 390.2 | 15243 | 15242 | 178.8 | 0.00% | 0 |

Invalid-credentials probe (separate, 5 tries): all HTTP 401 in 15.6–20.2ms.

## C. Individual components (p50/p90/p95 ms; RPS = isolated-harness throughput, not API RPS)

db_lookup (same SELECT as login, pool limit 10):

| Workers | p50 | p90 | p95 | Avg | Total | Fails | RPS |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 0.40 | 0.77 | 0.81 | 0.49 | 610992 | 0 | 20366 |
| 25 | 1.16 | 1.55 | 1.60 | 1.24 | 605966 | 0 | 20199 |
| 50 | 2.40 | 2.79 | 2.85 | 2.43 | 617039 | 0 | 20567 |
| 100 | 4.87 | 5.29 | 5.39 | 4.85 | 618942 | 0 | 20629 |

bcrypt_compare (`bcrypt.compare`, `$2b$08$` hash):

| Workers | p50 | p90 | p95 | Avg | Total | Fails | RPS |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 36.7 | 41.0 | 42.1 | 36.8 | 8152 | 0 | 271 |
| 25 | 91.2 | 96.0 | 98.0 | 91.9 | 8172 | 0 | 272 |
| 50 | 183.0 | 188.0 | 189.7 | 182.7 | 8235 | 0 | 273 |
| 100 | 364.3 | 372.1 | 375.0 | 364.2 | 8287 | 0 | 273 |

jwt_sign (same payload shape/expiry; secret-independent timing):

| Workers | p50 | p90 | p95 | Avg | Total | Fails | RPS |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 0.45 | 0.50 | 0.52 | 0.47 | 635264 | 0 | 21175 |
| 25 | 1.14 | 1.22 | 1.27 | 1.18 | 634002 | 0 | 21133 |
| 50 | 2.26 | 2.41 | 2.50 | 2.34 | 641029 | 0 | 21368 |
| 100 | 4.62 | 4.90 | 5.38 | 4.76 | 630566 | 0 | 21019 |

Remaining auth processing (scope lookup): for MAINTENANCE_STAFF, buildUserScope performs
zero DB queries (only SUPERADMIN/ADMIN query); remainder is jwt.sign above (sub-ms–5ms).

## D. CPU / memory (backend % of total capacity; core = busiest-core busy %)

| VUs | Backend before | Backend during (avg) | Backend after | Core peak | Cores ≥80% | GET / proxy (avg) | Backend RSS peak |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 0.1% | 22.5% | 2.8% | 37.6% | 0 | 2.11ms | 124 MB |
| 25 | 0.1% | 31.3% | 9.6% | 48.3% | 0 | 2.62ms | 154 MB |
| 50 | 0.1% | 48.9% | 11.6% | 73.3% | 0 | 3.08ms | 214 MB |
| 100 | 0.1% | 72.5% | 24.4% | 86.4% | ≤4 samples | 1.89ms | 238 MB |

MySQL CPU during full sign-in: <1% at all levels. No direct event-loop metric exists
without app instrumentation; GET / (no DB/bcrypt) stayed 2–3ms → no event-loop contention.
CPU frequency scaled with load (avg 1075 → 1565 → 1848 → 3036 MHz), which explains §E.

## E. Interpretation
- 10→50 VUs: p50 flat (~60–61ms), p90/p95 creep (+8/+14ms), throughput scales linearly
  (17→42→84 RPS) → system keeps up; added concurrency becomes queueing, not collapse.
- 100 VUs: p50 drops to 17.4ms — reproducible (same dip in the repo's prior independent
  cost-8 sweeps: p50 19.4/18.6/17.6/18.5). Cause is CPU frequency scaling, not caching:
  avg clock rose 1075→3036MHz across the sweep and bcrypt is purely CPU-bound
  (no cache exists for a fresh compare). p95 stays ~79ms and max grows to 390ms,
  showing the queueing tail the median hides.
- bcrypt is the primary bottleneck: isolated bcrypt throughput is flat at ~272 rps no
  matter the workers (CPU/threadpool-bound) while DB (~20k rps) and JWT (~21k rps) are
  ~75x faster. Full-flow p50 (≈60ms at 10–50 VU) ≈ bcrypt cost + pool queueing + network.
- No CPU saturation at 10–50 VUs; at 100 VUs the hottest core hits 86% with brief
  ≥80% samples — approaching but not pegged. MySQL never exceeds 1% in full-flow runs.
- p50/p90/p95 differ because bcrypt queueing + libuv scheduling spread the tail;
  medians track per-compare CPU time (clock-speed dependent), tails track contention.
- Throughput increases proportionally with concurrency (17.0/42.0/83.9/178.8 RPS).

## F. Final verification
- Sweep completed successfully 05:42–05:57 UTC; backend + DB healthy after (health check OK).
- No app logic, auth behavior, API contracts, schema, bcrypt defaults, or existing hashes
  changed (git status shows only new test files; all staff hashes except the new isolated
  account remain `$2b$10$`). No destructive ops; local box only, no prod traffic.
- Zero failed logins, zero timeouts, zero status_other across all levels.
- Limitation: one rep per level in this sweep; reproducibility backed by prior independent
  runs in loadtest/ showing the same 100-VU pattern. Component harnesses run a harsher
  closed-loop regime — their RPS/latencies must not be compared to, or summed into, API latency.
- Secrets: password/hash live only in /tmp + process env; results dir verified to contain
  neither (0 hits). Isolated test account `k6-cost8@hostel.local` intentionally retained,
  documented above.

## Commit-cleanup note
Bulky per-sample files (sampler CSVs, per-request JSONL timing logs, stdout logs) were removed
before commit; all summary JSONs and this report are retained. Method scripts are committed alongside.
