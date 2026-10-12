import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Dedicated verification run: full sign-in flow @ bcrypt cost 8 (NEW FILE).
// Does NOT modify any existing scripts; results go to a NEW results dir.
//
// Endpoint : POST {BASE_URL}/api/session  (routes/index.ts:33 -> loginStaff)
// Body     : {"email": isolated cost-8 account, "password": <env only>}
// Stages (identical shape at every VU level):
//   ramp-up 15s -> hold 60s (measurement) -> ramp-down 10s
// VUs are concurrent simulated users, NOT a guaranteed req/s rate.
// Credentials NEVER hardcoded. Supply via env:
//   K6_BASE_URL, K6_COST8_EMAIL, K6_COST8_PASSWORD, K6_VUS
// Tokens/passwords are never logged.
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:5000';
const EMAIL = __ENV.K6_COST8_EMAIL || 'k6-cost8@hostel.local';
const PASSWORD = __ENV.K6_COST8_PASSWORD || '';
const VUS = parseInt(__ENV.K6_VUS || '10', 10);

const loginDuration = new Trend('login_duration_ms', true);
const loginFailRate = new Rate('login_failed');
const loginSuccess = new Counter('login_success_total');
const status200 = new Counter('status_200_total');
const status401 = new Counter('status_401_total');
const statusOther = new Counter('status_other_total');
const timeouts = new Counter('timeout_total');

export const options = {
  stages: [
    { duration: '15s', target: VUS }, // ramp-up / stabilize
    { duration: '60s', target: VUS }, // measurement window
    { duration: '10s', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: false }],
  },
};

export function setup() {
  if (!PASSWORD) {
    throw new Error('K6_COST8_PASSWORD env var is required (not hardcoded).');
  }
  // Warm-up probe with a wrong password: expect 401 (proves endpoint is live
  // without spending a cost-8 compare or logging secrets). Any 5xx/timeout
  // aborts before the load stages.
  const res = http.post(
    `${BASE_URL}/api/session`,
    JSON.stringify({ email: EMAIL, password: '___warmup_probe___' }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: '10s' }
  );
  if (res.status !== 401 && res.status !== 200) {
    throw new Error(`Warm-up probe unexpected status=${res.status} at ${BASE_URL}/api/session`);
  }
  return { vus: VUS };
}

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const params = {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: '15s',
    tags: { endpoint: 'login' },
  };
  const t0 = Date.now();
  const res = http.post(`${BASE_URL}/api/session`, payload, params);
  const elapsed = Date.now() - t0;

  loginDuration.add(res.timings.duration);
  const timedOut = res.timings.duration >= 15000 || elapsed >= 15000 || res.status === 0;
  if (timedOut) timeouts.add(1);
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
    bcrypt_cost: 8,
    account: EMAIL,
    vus: VUS,
    stages: 'ramp15s/hold60s/down10s',
    total_requests: m.http_reqs ? m.http_reqs.values.count : null,
    successful_requests: m.status_200_total ? m.status_200_total.values.count : null,
    failed_requests: m.http_req_failed ? m.http_req_failed.values.fails : null,
    http_req_failed_rate: m.http_req_failed ? m.http_req_failed.values.rate : null,
    timeout_count: m.timeout_total ? m.timeout_total.values.count : 0,
    http_req_duration_ms: {
      avg: d.avg ?? null,
      min: d.min ?? null,
      med_p50: d.med ?? d['p(50)'] ?? null,
      max: d.max ?? null,
      p50: d['p(50)'] ?? d.med ?? null,
      p90: d['p(90)'] ?? null,
      p95: d['p(95)'] ?? null,
      p99: d['p(99)'] ?? null,
    },
    status_counts: {
      status_200: m.status_200_total ? m.status_200_total.values.count : 0,
      status_401: m.status_401_total ? m.status_401_total.values.count : 0,
      status_other: m.status_other_total ? m.status_other_total.values.count : 0,
    },
    throughput_rps: m.http_reqs ? m.http_reqs.values.rate : null,
  };
  const tag = `${VUS}vu`;
  const out = {};
  out.stdout = JSON.stringify(summary, null, 2) + '\n';
  out[`loadtest/test-results-cost8-20261012/full-signin-${tag}-summary.json`] = JSON.stringify(data, null, 2);
  return out;
}
