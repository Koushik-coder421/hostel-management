# Sign In Load Test — Before vs After bcrypt Optimization

## Test objective

Verify that the bcrypt optimization in the existing Sign In authentication flow
(`POST /api/session` → `loginStaff` in `backend/src/controllers/auth.controller.ts`)
preserves correctness and does not regress performance under load.

## API tested

- **Endpoint:** `POST {BASE_URL}/api/session`
- **Method:** POST
- **Payload pattern:** `{"email": "<staff email>", "password": "<staff password>"}`
  (credentials supplied via `K6_LOGIN_EMAIL` / `K6_LOGIN_PASSWORD` env vars only —
  never hardcoded, never logged)
- **Flow per request:** JSON parse → `SELECT staff BY email` → status check →
  `bcrypt.compare` → `jwt.sign` (24h) + `buildUserScope` → JSON response

## Test configuration (identical for both runs)

| Setting | Before | After |
|---|---|---|
| Script | `loadtest/login-100vu.js` | `k6/scripts/signin-load-test.js` (same logic/options) |
| VUs | 100 | 100 |
| Duration | 2m (actual run time 121.6s) | 2m via `K6_DURATION=2m` (actual run time 121.5s) |
| Thresholds | `http_req_failed rate<0.05`, `http_req_duration p(95)<2000` | same |
| Environment | local backend + local MySQL | same host, same backend, same DB |

> Note: the checked-in script default is `1m`; the preserved BEFORE artifact
> actually ran ~121.6s, so the AFTER run used `K6_DURATION=2m` to match it.
> Both threshold sets passed in both runs.

## Environment

- Backend: Node.js + Express, `bcrypt@6` (native, async), `mysql2/promise` pool
- K6: `k6 v0.55.0` (linux/amd64)
- Results: `k6/metrics/before-optimization/signin-results.json` (preserved
  original, copied from `loadtest/summary-100vu.json`, never overwritten),
  `k6/metrics/after-optimization/signin-results.json` (fresh run)

## Results

For latency metrics **lower is better**. For throughput **higher is better**.

| Metric | Before | After | Change |
|---|---:|---:|---:|
| Requests | 7976 | 7999 | +23 (+0.29%) |
| Iterations | 7975 | 7998 | +23 (+0.29%) |
| Avg (ms) | 1013.16 | 1008.77 | -4.39 (-0.43%) |
| Min (ms) | 58.25 | 58.36 | +0.11 (+0.19%) |
| P50 / med (ms) | 1014.72 | 1009.97 | -4.75 (-0.47%) |
| P90 (ms) | 1036.22 | 1032.53 | -3.69 (-0.36%) |
| P95 (ms) | 1044.50 | 1040.80 | -3.70 (-0.35%) |
| Max (ms) | 1537.21 | 1556.22 | +19.01 (+1.24%) |
| P99 (ms) | n/a | n/a | n/a — not emitted by either K6 run (`summaryTrendStats` is avg/min/med/max/p90/p95) |
| Error rate (`http_req_failed`) | 0.000125 | 0.000125 | 0.00% (1 failed req in each run — the warm-up probe path) |
| Throughput (req/s) | 65.61 | 65.81 | +0.20 (+0.30%) |
| VUs max | 100 | 100 | same |

## Error rate comparison

Identical: one non-2xx request in each run at a rate of ~1.25e-4, well under
the `rate<0.05` threshold. No auth failures under load; all measured logins
returned 200 with a valid token.

## Throughput comparison

65.61 → 65.81 req/s (+0.30%). No throughput regression; the delta is within
normal run-to-run variance.

## Final conclusion

- **No performance regression.** Latency percentiles improved marginally
  (~0.4% across avg/P50/P90/P95) and throughput held steady.
- The optimization's primary gains are **robustness, not raw speed** (bcrypt at
  cost 10 dominates request time by design — that is the security working as
  intended):
  - fail-fast rejection of oversized/non-string passwords before `bcrypt.compare`,
  - constant-time dummy-hash compare on unknown-user and invalid-input paths
    (timing-attack mitigation),
  - overlapping of `jwt.sign` with the `buildUserScope` DB lookup,
  - env-configurable cost factor (`BCRYPT_ROUNDS`, default 10 — security unchanged).
- API contract unchanged: same routes, same status codes, same response shape;
  signup/signin/token behavior verified manually against the running backend.

## K6 in CI

The K6 load test is intentionally **not** part of PR CI. It requires a live
backend + seeded database with real credentials and produces load that is
unsafe against shared/production environments. CI validates code (typecheck,
build, tests); K6 remains a reproducible manual performance test — run it with:

```bash
K6_BASE_URL=http://localhost:5000 \
K6_LOGIN_EMAIL=maint@hostel.com \
K6_LOGIN_PASSWORD=<secret> \
K6_DURATION=2m \
k6 run k6/scripts/signin-load-test.js
```
