# Final Clean Performance Benchmark — Sign-In Flow

> Purpose: measurement only. No optimization or behavior change was applied during this experiment.
> Method: database reset via the project's existing `backend/src/database/reset.ts`, isolated component
> benchmarks, then the existing k6 sign-in test at 10/25/50/100 VUs (1 minute each, same script, endpoint,
> credentials, machine, Node configuration, bcrypt cost factor 10).

---

## 1. Database reset verification

- Reset mechanism: `backend/src/database/reset.ts` (truncate with FK checks off + reseed; **no DDL, schema unchanged**).
- Before reset: staff=3, tenant/hostel/payment/room/bed=0, hashes `$2b$10$`.
- After reset: identical — staff=3 (`admin@hostel.com` ADMIN, `supervisor@hostel.com` SUPERVISOR,
  `maint@hostel.com` MAINTENANCE_STAFF, all ACTIVE), operational tables 0, all hashes cost **10**.
- `maint@hostel.com` exists; login verified working immediately after reset.
- Same credentials as all previous benchmarks. No unnecessary test data created.

---

## 2. Individual component benchmark (isolated, post-reset DB)

| Component | Avg | p50 | p90 | p95 | Min | Max |
|---|---:|---:|---:|---:|---:|---:|
| MySQL staff lookup (n=500) | 0.24ms | 0.21ms | 0.35ms | 0.45ms | 0.14ms | 2.60ms |
| bcrypt.compare (n=100) | 55.66ms | 55.56ms | 56.28ms | 56.97ms | 54.75ms | 57.85ms |
| buildUserScope (n=200) | 0.003ms | 0.001ms | 0.003ms | 0.004ms | 0.001ms | 0.37ms |
| jwt.sign (n=1000) | 0.07ms | 0.06ms | 0.10ms | 0.11ms | 0.05ms | 2.11ms |
| Other backend work | ≤0.5ms (residual: instrumented total minus segments ≈ 0.01–0.3ms) | — | — | — | — | — |
| Total backend (single uncontended login) | ~61–69ms | — | — | — | — | — |

### A. Isolated bcrypt execution

~55.66ms average when `bcrypt.compare` runs without concurrent login load (cost factor 10).

### B. In-request bcrypt segment

The bcrypt timing observed during actual sign-in requests (see table in section 3).
Where the in-request segment exceeds ~55.66ms, the difference is waiting/queueing for a
libuv threadpool slot and CPU — it is **not** pure bcrypt CPU execution.

---

## 3. Full sign-in benchmark (10/25/50/100 VUs, 1 min each)

| VUs | Requests | Avg | p50 | p90 | p95 | Max | RPS | Error rate | CPU |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 911 | 164.6 | 168.0 | 172.6 | 174.5 | 204.4 | 15.01 | 0.001098 | 40.1% |
| 25 | 2255 | 167.0 | 167.1 | 174.9 | 179.6 | 412.5 | 37.16 | 0.000443 | 72.5% |
| 50 | 3972 | 259.4 | 255.8 | 272.8 | 282.0 | 789.1 | 65.31 | 0.000252 | 99.2% |
| 100 | 4030 | 1007.0 | 1010.7 | 1033.6 | 1044.8 | 1582.4 | 65.46 | 0.000248 | 99.2% |

Backend component timing per load level:

| VUs | Backend Avg | Backend p50 | Backend p90 | Backend p95 | MySQL Avg | bcrypt Avg | Scope Avg |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 162.2 | 165.5 | 170.1 | 172.1 | 2.60 | 159.4 | 0.17 |
| 25 | 165.6 | 165.6 | 173.6 | 178.3 | 1.40 | 164.0 | 0.14 |
| 50 | 258.1 | 254.5 | 271.7 | 280.8 | 1.09 | 256.9 | 0.15 |
| 100 | 1005.9 | 1009.8 | 1032.7 | 1043.7 | 1.24 | 1004.5 | 0.14 |

Backend total tracks k6 HTTP latency within ~1–2ms at every level (localhost network + JSON
serialization is negligible).

---

## 4. Bcrypt execution vs waiting analysis

Estimated waiting = in-request bcrypt average − isolated bcrypt average (55.66ms).
Clearly labeled as an **estimate**, not a directly measured queue timer.

| VUs | Isolated bcrypt | In-request bcrypt | Estimated waiting |
|---:|---:|---:|---:|
| 10 | 55.66 | 159.4 | ~104ms |
| 25 | 55.66 | 164.0 | ~108ms |
| 50 | 55.66 | 256.9 | ~201ms |
| 100 | 55.66 | 1004.5 | ~949ms |

Waiting grows monotonically with concurrency and explodes ×5 between 50→100 VU.
At 100 VU, ~95% of the in-request bcrypt segment is queue wait, not hashing.

---

## 5. CPU utilization

| VUs | CPU utilization |
|---:|---:|
| 10 | 40.1% usr |
| 25 | 72.5% usr |
| 50 | 99.2% usr (saturated) |
| 100 | 99.2% usr (saturated) |

- Saturation begins between 25–50 VU (72% → 99%).
- bcrypt is responsible: the only CPU-heavy segment (~55ms of ~57ms per request; all else ≈1.5ms).
- Throughput stops increasing after saturation: 65.31 → 65.46 RPS (50→100 VU).
- Latency keeps climbing after the plateau: p95 282 → 1045ms.

---

## 6. Comparison with previous baseline

Previous 100-VU baseline: ~1010 avg / 1013 p50 / 1040 p90 / 1055 p95 / ~65 RPS / ~99% CPU /
bcrypt ~1007ms / wait ~953ms.

Clean final: 1007.0 / 1010.7 / 1033.6 / 1044.8 / 65.46 / 99.2% / 1004.5 / ~949ms.

**The database reset changed nothing material** — deltas ≤1%, within run variance.
No improvement is claimed; the DB was never a factor.

---

## 7. Final conclusion

1. Sign-in functions correctly (valid login succeeds, invalid fails 401, format unchanged).
2. Isolated bcrypt execution: **~55.7ms avg** (p50 55.6 / p90 56.3 / p95 57.0).
3. In-request bcrypt p50/p90/p95 — 10 VU: 162.8/167.7/169.8 → 100 VU: 1008.5/1031.7/1042.6.
4. MySQL p50/p90/p95 stays ~0.8–1.8 / ~1.9–5.3 / ~2–6.6ms at all levels — flat.
5. Backend total p50/p90/p95 — 165.5/170.1/172.1 (10 VU) → 1009.8/1032.7/1043.7 (100 VU).
6. Latency inflects significantly between **25→50 VU** (CPU 72%→99%).
7. Estimated waiting: ~104 / ~108 / ~201 / ~949ms at 10/25/50/100 VU.
8. MySQL is **not** a bottleneck.
9. **bcrypt is the dominant CPU workload** (~97% of per-request CPU).
10. **CPU saturates** (~99% from 50 VU).
11. **Throughput plateaus** (~65 RPS).
12. **p95 keeps rising** post-plateau (282→1045ms).
13. **No remaining safe code-level optimization** — non-bcrypt work is ~1.5ms.
14. **DB cleanup has no material effect**.

**Bottleneck verdict: CPU capacity**, manifesting as libuv threadpool queueing — not the database,
not bcrypt's algorithm per se (its ~55ms is fixed and correct), not the network, not application
overhead. Each login needs ~55ms of CPU that cannot be optimized away safely; 4 cores sustain
~65 such logins/sec, and everything beyond that waits ~950ms in line. No solution is forced:
capacity (more cores/processes) or a lower cost factor (security tradeoff, needs approval) are the
only levers, and neither was applied.

### Final validation

- Valid login OK; invalid-password login correctly rejected (`Invalid credentials`).
- Response keys unchanged (`data/message/status/success/token/user`).
- Staff rows still 3 with cost-10 hashes; no unintended DB modification.
- `UV_THREADPOOL_SIZE` unset (default); no permanent configuration changes.
- Only changed file: temporary instrumentation (`auth.controller.ts`, +24/−0) — kept live for
  measurements; recommended for removal once this report is accepted.
