# Investigation: 100-VU full sign-in (p50 17.4ms) vs isolated bcrypt (p50 364.3ms)

Date: 2026-10-12. Guards: no production code, bcrypt cost, hashes, auth behavior,
DB data, or endpoints changed (git shows only new test files; staff table still 5 rows).
Test-only instrumentation = a `require('bcrypt')` timing wrapper loaded with `node -r`
into a separate backend copy on port 5001 (same DB, same code, two `performance.now()`
calls of overhead, result passed through untouched). Instrumented backend stopped afterwards.
All findings saved here; existing benchmark results not overwritten.

## 1. Does every successful login execute bcrypt.compare? YES
- `POST /api/session` has exactly one handler: `routes/index.ts:33 → loginStaff`.
  Middleware chain is cors → json → routes → errorHandler (no cache/proxy/mock anywhere).
- `loginStaff` (controllers/auth.controller.ts:77-165): SELECT by email → status check →
  `bcrypt.compare(password, staff.password_hash)` → 401 on mismatch; 200 only after `isMatch`.
  Test account is ACTIVE with a hash present, so no early-return path applies.
- Main 100-VU run: 15242 iterations, 15242×200, checks 30484/30484 pass, `login_failed=0`.
- Direct proof: in-handler timing captured 5253 compares for 5252 iterations + 1 setup probe
  (100-VU instrumented run), and 516 for 515 + 1 (10-VU run). No shortcut exists.

## 2. Same implementation/hash, different concurrency regime
- Both use the backend's own native `bcrypt` package; harness hash byte-identical to the
  DB-stored hash (diff clean apart from mysql's trailing newline); rounds = 8 both sides.
- `UV_THREADPOOL_SIZE` unset → libuv default = 4 hash threads (verified in backend env).
- Concurrency differs fundamentally (this is the discrepancy, not a flaw in either test):
  - k6 100 VU with 0.5s sleep: per-VU period ≈ 559ms (26ms request + 500ms sleep) →
    offered load 178.8 rps, in-flight ≈ 178.8 × 0.026 ≈ 5 concurrent compares ≈ thread count → almost no queueing.
  - Isolated harness, 100 closed-loop workers, no think time: 100 concurrent compares on
    4 threads → ~25-deep queues → ~25 × ~15ms ≈ 375ms ≈ measured p50 364.3ms.
  - Cross-check via Little's law on harness data: capacity 272.9 rps → 100/272.9 = 366ms. Bullseye.
  - Harness throughput is flat ~272 rps at 10/25/50/100 workers: textbook CPU/threadpool-bound
    signature — adding workers only adds queueing latency.

## 3. What each timer measures (not equivalent quantities)
- k6 `http_req_duration` = client-measured round trip; `http_req_waiting` (server time)
  med 17.38 ≈ duration med 17.44 → network negligible, ~all time is server-side.
- Harness = in-process `performance.now()` around `await bcrypt.compare` (no network/DB/JWT).
- In-handler compare vs e2e waiting, same run:
  - 100 VU: compare p50 15.9 / p90 54.0 / p95 84.0 vs e2e 17.7 / 56.9 / 88.4 → ~2ms gap (DB+JWT+network).
  - 10 VU: compare p50 42.4 / p90 65.7 / p95 75.2 vs e2e 45.9 / 70.2 / 79.0 → ~3ms gap.
  Distributions track across percentiles → compare dominates end-to-end; nothing bypassed.

## 4. Raw data status
- Main sweep saved summaries only (no per-request k6 samples) — limitation stated, not worked around:
  100-VU waiting distribution min 14.45 / med 17.38 / p90 48.6 / p95 79.0 / max 390.1; all-200 statuses.
- This investigation collected full per-request in-handler distributions
  (`bcrypt-timing-100vu.jsonl` n=5253, `bcrypt-timing-10vu.jsonl` n=516).

## 5. Instrumentation (test-only, behavior-preserving) — done, see §3 and §7 tables.

## 6. Sequencing and machine state
- Main sweep ran strictly sequentially (sampler timestamps: full-100 05:54:10–05:55:36,
  bcrypt-100 05:56:28–05:57:02, no overlap). Instrumentation runs likewise sequential.
- Same box for all tests. Avg clock during high-load phases: full-100 3036, bcrypt-100 3235,
  invest-100 3300 MHz — comparable regimes, so clock does NOT explain the 17-vs-364ms gap.

## 7. Measured time-course (compare p50 per 5s bin + sampler clock)
100 VU (clock pegged 3300 throughout): +0s 20.0 / +5s 15.9 / +10s 15.6 / +15s 15.6 / +20s 15.6 (n≈965/bin).
10 VU (clock oscillating 800↔3374, powersave governor hunting): +0s 31.8 / +5s 43.3 / +10s 42.5 /
+15s 49.3 / +20s 55.1 (n≈90/bin); latency co-varies with low-clock samples.
Single idle compare before load: 30.8ms.
Anomaly noted: 100-VU +25s (ramp-down) bin p50 44.9 (n=471) — transition window, excluded from
steady-state conclusions, cause not established.

## Conclusion (evidence-backed)
- The 17.4ms vs 364.3ms gap is fully explained by offered concurrency vs 4 libuv threads:
  ~5 concurrent (k6, sleep-paced) vs 100 concurrent (closed-loop harness). The harness's own
  throughput (272.9 rps ⇒ ~14.6ms true service time) matches the in-handler measurement
  (15.9ms) — the loop is closed quantitatively. No shortcut, cache, or mock is involved.
- CPU frequency scaling is NOT the cause of the cross-test gap (clocks were comparably high
  in both). It IS the evidenced cause of the smaller within-server shift (in-handler 42.4ms
  at 10 VU vs 15.9ms at 100 VU), supported by per-bin co-variation of latency with clock
  on identical code/hash/box — stated only with that evidence, per instructions.

## Files
- `bcrypt-timing-100vu.jsonl` / `bcrypt-timing-10vu.jsonl`: per-request in-handler compare ms.
- `k6-invest-100vu-summary.json` / `k6-invest-10vu-summary.json`: confirmatory k6 summaries (port 5001).
- `cpu-invest-*.csv`: system sampler; `cpu-instbackend-10vu.csv`: (partial — PID-tracking caveat, unused).
- Method scripts (new, test-only): `loadtest/cost8-instrument-hook.js`, `loadtest/cost8-investigate-short.js`.

## Commit-cleanup note
Bulky per-sample files (sampler CSVs, per-request JSONL timing logs, stdout logs) were removed
before commit; all summary JSONs and this report are retained. Method scripts are committed alongside.
