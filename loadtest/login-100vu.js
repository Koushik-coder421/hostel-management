import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Grafana k6 (open-source, https://github.com/grafana/k6)
// Hostel Management — login load test, 100 concurrent VUs
//
// Endpoint (verified in backend/src/controllers/auth.controller.ts:57-131,
// routes/index.ts:33, app.ts:21):
//   POST {BASE_URL}/api/session
//   Body: {"email": "...", "password": "..."}
//   Flow: JSON parse -> SELECT staff BY email -> status check ->
//         bcrypt.compare (cost 10) -> jwt.sign (24h) -> buildUserScope -> JSON
//   Pool: mysql2/promise, connectionLimit 10 (config/database.ts:6-15)
//
// Credentials are NEVER hardcoded here. Supply via env:
//   K6_BASE_URL, K6_LOGIN_EMAIL, K6_LOGIN_PASSWORD
// Tokens/passwords are never logged.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:5000';
const EMAIL = __ENV.K6_LOGIN_EMAIL || 'maint@hostel.com';
const PASSWORD = __ENV.K6_LOGIN_PASSWORD || '';

const loginDuration = new Trend('login_duration_ms', true);
const loginFailRate = new Rate('login_failed');
const loginSuccess = new Counter('login_success_total');
const status200 = new Counter('status_200_total');
const status401 = new Counter('status_401_total');
const statusOther = new Counter('status_other_total');

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    // NOTE: project defines no SLOs. These are ASSUMED guardrails for the
    // test run only, not project requirements:
    //   - error rate < 5%
    //   - p95 < 2000ms
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: false }],
  },
};

export function setup() {
  if (!PASSWORD) {
    throw new Error('K6_LOGIN_PASSWORD env var is required (not hardcoded).');
  }
  // Single warm-up login to fail fast on bad config/creds (no secrets logged).
  const res = http.post(
    `${BASE_URL}/api/session`,
    JSON.stringify({ email: EMAIL, password: '___warmup_probe___' }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: '10s' }
  );
  // We expect 401 for the probe password; anything else (e.g. 5xx, timeout,
  // connection refused) aborts before the 100-VU run.
  if (res.status !== 401 && res.status !== 200) {
    throw new Error(`Warm-up probe unexpected status=${res.status} at ${BASE_URL}/api/session`);
  }
  return { baseUrl: BASE_URL };
}

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const params = {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: '15s',
    tags: { endpoint: 'login' },
  };
  const res = http.post(`${BASE_URL}/api/session`, payload, params);

  loginDuration.add(res.timings.duration);
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has token': (r) => {
      try {
        const b = r.json();
        return !!(b && (b.token || (b.data && b.data.token)));
      } catch {
        return false;
      }
    },
  });
  loginFailRate.add(!ok);
  if (res.status === 200 && ok) loginSuccess.add(1);
  if (res.status === 200) status200.add(1);
  else if (res.status === 401) status401.add(1);
  else statusOther.add(1);

  sleep(0.5);
}

export function handleSummary(data) {
  const m = data.metrics;
  const d = m.http_req_duration ? m.http_req_duration.values : {};
  const summary = {
    endpoint: `${BASE_URL}/api/session`,
    vus: 100,
    duration: '1m',
    total_requests: m.http_reqs ? m.http_reqs.values.count : null,
    failed_requests: m.http_req_failed ? m.http_req_failed.values.passes !== undefined : null,
    http_req_failed_rate: m.http_req_failed ? m.http_req_failed.values.rate : null,
    http_req_duration_ms: {
      avg: d.avg ?? null,
      max: d.max ?? null,
      p50: d['p(50)'] ?? null,
      p90: d['p(90)'] ?? null,
      p95: d['p(95)'] ?? null,
    },
    login_duration_ms: m.login_duration_ms ? m.login_duration_ms.values : null,
    status_counts: {
      status_200: m.status_200_total ? m.status_200_total.values.count : null,
      status_401: m.status_401_total ? m.status_401_total.values.count : null,
      status_other: m.status_other_total ? m.status_other_total.values.count : null,
    },
    http_reqs_per_sec: m.http_reqs ? m.http_reqs.values.rate : null,
    // NOTE: no credentials or tokens included here by design.
  };
  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    'loadtest/summary-100vu.json': JSON.stringify(data, null, 2),
  };
}
