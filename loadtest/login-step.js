import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Grafana k6 open-source stepped login test.
// Same endpoint/flow as login-100vu.js: POST {BASE_URL}/api/session
// Parametrized: K6_VUS, K6_DURATION (e.g. 10 / 2m). Timeout fixed 15s.
// Creds ONLY via env: K6_BASE_URL, K6_LOGIN_EMAIL, K6_LOGIN_PASSWORD. Never logged.

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:5000';
const EMAIL = __ENV.K6_LOGIN_EMAIL || 'maint@hostel.com';
const PASSWORD = __ENV.K6_LOGIN_PASSWORD || '';
const VUS = parseInt(__ENV.K6_VUS || '10', 10);
const DURATION = __ENV.K6_DURATION || '2m';

const loginDuration = new Trend('login_duration_ms', true);
const loginFailRate = new Rate('login_failed');
const status200 = new Counter('status_200_total');
const status401 = new Counter('status_401_total');
const statusOther = new Counter('status_other_total');

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    // ASSUMED comparison thresholds only, NOT project SLOs:
    // p95 ideally < 2s, error ideally < 5%
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<2000', abortOnFail: false }],
  },
};

export function setup() {
  if (!PASSWORD) throw new Error('K6_LOGIN_PASSWORD env var is required.');
  const res = http.post(
    `${BASE_URL}/api/session`,
    JSON.stringify({ email: EMAIL, password: '___warmup_probe___' }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: '10s' }
  );
  if (res.status !== 401 && res.status !== 200) {
    throw new Error(`Warm-up probe unexpected status=${res.status}`);
  }
  return { baseUrl: BASE_URL, vus: VUS, duration: DURATION };
}

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const res = http.post(`${BASE_URL}/api/session`, payload, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    timeout: '15s',
    tags: { endpoint: 'login' },
  });
  loginDuration.add(res.timings.duration);
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has token': (r) => {
      try {
        const b = r.json();
        return !!(b && (b.token || (b.data && b.data.token)));
      } catch { return false; }
    },
  });
  loginFailRate.add(!ok);
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
    vus: VUS,
    duration: DURATION,
    total_requests: m.http_reqs ? m.http_reqs.values.count : null,
    http_req_failed_rate: m.http_req_failed ? m.http_req_failed.values.rate : null,
    http_req_duration_ms: {
      avg: d.avg ?? null, max: d.max ?? null,
      p50: d['p(50)'] ?? d.med ?? null,
      p90: d['p(90)'] ?? null, p95: d['p(95)'] ?? null,
    },
    status_counts: {
      status_200: m.status_200_total ? m.status_200_total.values.count : 0,
      status_401: m.status_401_total ? m.status_401_total.values.count : 0,
      status_other: m.status_other_total ? m.status_other_total.values.count : 0,
    },
    http_reqs_per_sec: m.http_reqs ? m.http_reqs.values.rate : null,
  };
  const tag = `${VUS}vu`;
  return {
    stdout: JSON.stringify(summary, null, 2) + '\n',
    [`loadtest/summary-${tag}.json`]: JSON.stringify(data, null, 2),
  };
}
