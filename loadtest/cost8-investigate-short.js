import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Investigation variant of cost8-verify-signin.js (NEW FILE): identical request
// flow/headers/timeout/sleep, but short stages for confirmatory runs.
// Env: K6_BASE_URL, K6_COST8_EMAIL, K6_COST8_PASSWORD, K6_VUS,
//      K6_RAMP (default 5s), K6_HOLD (default 20s), K6_DOWN (default 5s), K6_TAG.

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:5001';
const EMAIL = __ENV.K6_COST8_EMAIL || 'k6-cost8@hostel.local';
const PASSWORD = __ENV.K6_COST8_PASSWORD || '';
const VUS = parseInt(__ENV.K6_VUS || '100', 10);
const TAG = __ENV.K6_TAG || `${VUS}vu`;

const loginDuration = new Trend('login_duration_ms', true);
const status200 = new Counter('status_200_total');

export const options = {
  stages: [
    { duration: __ENV.K6_RAMP || '5s', target: VUS },
    { duration: __ENV.K6_HOLD || '20s', target: VUS },
    { duration: __ENV.K6_DOWN || '5s', target: 0 },
  ],
  thresholds: {},
};

export function setup() {
  if (!PASSWORD) throw new Error('K6_COST8_PASSWORD env var is required.');
  const res = http.post(
    `${BASE_URL}/api/session`,
    JSON.stringify({ email: EMAIL, password: '___warmup_probe___' }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: '10s' }
  );
  if (res.status !== 401 && res.status !== 200) {
    throw new Error(`Warm-up probe unexpected status=${res.status}`);
  }
}

export default function () {
  const res = http.post(
    `${BASE_URL}/api/session`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: '15s', tags: { endpoint: 'login' } }
  );
  loginDuration.add(res.timings.duration);
  check(res, { 'status is 200': (r) => r.status === 200 });
  if (res.status === 200) status200.add(1);
  sleep(0.5);
}

export function handleSummary(data) {
  const out = {};
  out.stdout = JSON.stringify({
    tag: TAG,
    total: data.metrics.http_reqs.values.count,
    ok200: data.metrics.status_200_total ? data.metrics.status_200_total.values.count : 0,
    rps: data.metrics.http_reqs.values.rate,
    duration: data.metrics.http_req_duration,
    waiting: data.metrics.http_req_waiting,
  }, null, 2) + '\n';
  out[`loadtest/investigation-100vu-20261012/k6-${TAG}-summary.json`] = JSON.stringify(data, null, 2);
  return out;
}
