# Final Clean Performance Benchmark — Sign-In Flow @ bcrypt cost 8

> Purpose: measurement only. No optimization or behavior change was applied during this experiment.
> Method: database state verified WITHOUT reset (reset.ts reseeds cost-10 hashes and would delete
> the isolated cost-8 account; truncation is additionally out of scope), sequential isolated component
> benchmarks, in-handler segment instrumentation on a separate port, then k6 sign-in runs at
> 10/25/50/100 VUs (ramp15s/hold60s/down10s; the 60s hold is the measurement window), same endpoint,
> machine, Node configuration, isolated cost-8 account. Production hashes remain cost 10 (untouched).

---

## 1. Database state verification (no reset — deliberate deviation, justified)

- Reset mechanism NOT run: `backend/src/database/reset.ts` truncates tables and reseeds
  cost-10 hashes — it would destroy the isolated cost-8 test account and violate the
  no-truncate/no-reseed constraint. **No DDL, no deletes, no hash modifications performed.**
- State verified: staff=5 (`admin@hostel.com` ADMIN, `supervisor@hostel.com` SUPERVISOR,
  `maint@hostel.com` MAINTENANCE_STAFF, `koushik10@test.com` HEAD — all ACTIVE, all `$2b$10$`;
  plus isolated `k6-cost8@hostel.local` MAINTENANCE_STAFF ACTIVE, `$2b$08$`, rounds verified 8).
- Operational tables untouched. `k6-cost8@hostel.local` login verified working (200 + token).
- Same isolated credentials for all cost-8 runs. No other test data created.

---

## 2. Individual component benchmark (sequential, isolated)

| Component                                | Avg                                                                | p50     | p90     | p95     | Min     | Max     |
|---                                       |---:                                                                |---:     |---:     |---:     |---:     |---:     |
| MySQL staff lookup (n=500)               | 0.30ms                                                             | 0.22ms  | 0.35ms  | 0.43ms  | 0.14ms  | 22.04ms |
| bcrypt.compare (n=100)                   | 14.13ms                                                            | 14.11ms | 14.40ms | 14.70ms | 13.66ms | 14.98ms |
| buildUserScope (n=200)                   | 0.003ms                                                            | 0.001ms | 0.001ms | 0.002ms | 0.000ms | 0.32ms  |
| jwt.sign (n=1000)                        | 0.07ms                                                             | 0.06ms  | 0.09ms  | 0.11ms  | 0.05ms  | 2.22ms  |
| Other backend work                       | ≤0.5ms (residual: instrumented total minus segments ≈ 0.01–0.3ms)  | —       | —       | —       | —       | —       |
| Total backend (single uncontended login) | ~15.7–21.6ms (5 sequential logins)                                 | —       | —       | —       | —       | —       |

### A. Isolated bcrypt execution

~14.13ms average when `bcrypt.compare` runs without concurrent login load (cost factor 8).

### B. In-request bcrypt segment

The bcrypt timing observed during actual sign-in requests (see table in section 3).
Where the in-request segment exceeds ~14.13ms, the difference is waiting/queueing for a
libuv threadpool slot and CPU-clock effects — it is **not** pure bcrypt CPU execution.

---

## 3. Full sign-in benchmark (10/25/50/100 VUs)

| VUs | Requests | Avg   | p50   | p90   | p95   | Max   | RPS    | Error rate | CPU   |
|---: |---:      |---:   |---:   |---:   |---:   |---:   |---:    |---:        |---:   |
| 10  | 1447     | 56.9  | 60.5  | 67.9  | 72.7  | 104.5 | 16.96  | 0.000691   | 22.5% |
| 25  | 3582     | 60.7  | 60.7  | 75.6  | 83.9  | 127.9 | 42.03  | 0.000279   | 31.3% |
| 50  | 7149     | 61.4  | 61.3  | 76.0  | 86.3  | 269.5 | 83.89  | 0.000140   | 48.9% |
| 100 | 15243    | 26.1  | 17.4  | 48.6  | 79.1  | 390.2 | 178.80 | 0.000066   | 72.5% |

Error rate is the single 401 setup probe per run; `login_failed=0`, timeouts=0 at all levels.
CPU = backend process % of total machine capacity (differs from the cost-10 report's usr metric).
100-VU p50 dip is a CPU-clock effect, evidenced separately (per-5s-bin co-variation, same code/hash).

Backend component timing per load level (`*` = sequential baseline, not under that load):

| VUs | Backend Avg | Backend p50 | Backend p90 | Backend p95 | MySQL Avg | bcrypt Avg | Scope Avg |
|---: |---:         |---:         |---:         |---:         |---:       |---:        |---:       |
| 10  | 56.7        | 60.3        | 67.7        | 72.5        | 0.30*     | 40.81      | 0.003*    |
| 25  | 60.6        | 60.6        | 75.5        | 83.9        | 2.75      | 57.28      | 0.22      |
| 50  | 61.3        | 61.2        | 75.9        | 86.2        | 2.07      | 60.27      | 0.18      |
| 100 | 26.1        | 17.4        | 48.6        | 79.0        | 0.30*     | 24.90      | 0.003*    |

Backend total tracks k6 HTTP latency within ~0.1ms at every level (localhost network negligible).
Scope in-handler values include ~0.1–0.2ms sync file-append overhead of the timing hook itself;
true scope work is ~0.001–0.003ms (sequential table; this role issues zero scope queries).

---

## 4. Bcrypt execution vs waiting analysis

Estimated waiting = in-request bcrypt average − isolated bcrypt average (14.13ms).
Clearly labeled as an **estimate**, not a directly measured queue timer; at 10/100 VU the
in-request figure also carries clock-speed effects (see investigation report).

| VUs | Isolated bcrypt | In-request bcrypt | Estimated waiting |
|---: |---:             |---:               |---:               |
| 10  | 14.13           | 40.81             | ~27ms             |
| 25  | 14.13           | 57.28             | ~43ms             |
| 50  | 14.13           | 60.27             | ~46ms             |
| 100 | 14.13           | 24.90             | ~11ms             |

Waiting is modest at all levels (tens of ms, not ~950ms as at cost 10). The 100-VU figure is
lower because the sustained load pins the CPU at ~3.3GHz while light-load runs idle at
~1–2GHz (measured per-bin co-variation; no caching exists for bcrypt).

---

## 5. CPU utilization (backend % of total 4-core capacity)

| VUs | CPU utilization        |
|---: |---:                    |
| 10  | 22.5% (hottest core 38%) |
| 25  | 31.3% (hottest core 48%) |
| 50  | 48.9% (hottest core 73%) |
| 100 | 72.5% (hottest core 86% brief, no peg) |

- No saturation at any level (cf. cost 10 saturating at 50 VU).
- bcrypt is still the dominant segment (~14ms of ~15ms per request; all else ≈1–3ms).
- Throughput scales ~linearly with concurrency: 16.96 → 42.03 → 83.89 → 178.80 RPS.
- p95 roughly flat: 72.7 → 83.9 → 86.3 → 79.1ms. MySQL <1% in all full-flow runs.

---

## 6. Comparison with cost-10 clean final

| Metric (100 VU) | Cost 10 | Cost 8 | Delta |
|---|---|---|---|
| Isolated bcrypt avg | 55.66ms | 14.13ms | 3.9× (matches 4× work factor) |
| Full-flow p50 / p95 | 1010.7 / 1044.8 | 17.4 / 79.1 | ~58× / ~13× |
| Throughput | 65.46 RPS (plateaued) | 178.80 RPS (scaling) | 2.7×, no plateau |
| CPU | 99.2% saturated | 72.5%, unsaturated | headroom remains |
| In-request wait (est.) | ~949ms | ~11ms | queueing eliminated |

No DB reset was performed for cost 8 (it would reseed cost-10 hashes); the cost-10 report
itself showed reset changed nothing (≤1%), and MySQL is <1% here too — the DB was never a factor.

---

## 7. Final conclusion

1. Sign-in functions correctly (valid login succeeds, invalid fails 401, format unchanged).
2. Isolated bcrypt execution: **~14.1ms avg** (p50 14.1 / p90 14.4 / p95 14.7).
3. In-request bcrypt p50/p90/p95 — 10 VU: 42.4/65.7/75.2 → 100 VU: 15.9/54.0/84.0
   (25 VU: 59.2/76.5/81.6; 50 VU: 58.9/80.9/94.0).
4. MySQL in-request p50/p90/p95 — 25 VU: 1.6/5.3/8.5; 50 VU: 1.4/3.3/4.7; sequential 0.22/0.35/0.43 — flat.
5. Backend total p50/p90/p95 — 60.3/67.7/72.5 (10 VU) → 17.4/48.6/79.0 (100 VU).
6. No latency inflection 25→50 VU (CPU 31%→49%, far from saturation); the 100-VU p50 dip is
   an evidenced clock-speed effect, not a measurement artifact.
7. Estimated waiting: ~27 / ~43 / ~46 / ~11ms at 10/25/50/100 VU.
8. MySQL is **not** a bottleneck.
9. **bcrypt is the dominant CPU workload** (~14ms of ~15ms per request).
10. **CPU does not saturate** through 100 VU (peak 72.5% backend, brief 86% single core).
11. **Throughput scales linearly** (~17→42→84→179 RPS) — no plateau.
12. **p95 stays roughly flat** (73→84→86→79ms).
13. **No remaining safe code-level optimization** — non-bcrypt work is ~1–3ms.
14. **Retaining the isolated cost-8 account has no material effect** on other users.

**Bottleneck verdict: bcrypt CPU, unsaturated.** Each login needs ~14ms of CPU; 4 cores sustain
~180 paced logins/sec with ~11–46ms of threadpool queueing. No solution is forced: if load must
grow further, capacity (more cores/processes) or a lower cost factor (security tradeoff, needs
approval) are the only levers, and neither was applied. Production security posture is unchanged
(all real hashes remain cost 10).

### Final validation

- Valid login OK; invalid-password login correctly rejected (`Invalid credentials`).
- Response keys unchanged (`data/message/status/success/token/user`).
- Staff rows: 4 pre-existing with cost-10 hashes + 1 isolated cost-8 account; no other DB change.
- `UV_THREADPOOL_SIZE` unset (default 4); no permanent configuration changes.
- No production file changed at any point — instrumentation was a `require` hook on a separate
  port-5001 backend (stopped; nothing to remove from prod). New test-only files:
  `loadtest/cost8-instrument-hook-v2.js`, `loadtest/cost8-sequential-components.js`,
  plus this directory (`sequential-components.json`, `k6-final-{25,50}vu-summary.json`,
  `inreq-{bcrypt,db,scope}-{25,50}vu.jsonl`). Earlier cost-8 evidence retained untouched in
  `loadtest/test-results-cost8-20261012/` and `loadtest/investigation-100vu-20261012/`.

## Commit-cleanup note
Bulky per-sample files (sampler CSVs, per-request JSONL timing logs, stdout logs) were removed
before commit; all summary JSONs and this report are retained. Method scripts are committed alongside.
