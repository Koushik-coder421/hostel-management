// Isolated individual-component harness @ bcrypt cost 8 (TEST-ONLY, NEW FILE).
// Measures each component in isolation under fixed-concurrency closed-loop
// load at 10/25/50/100 concurrent workers. Does NOT touch the sign-in
// workflow, adds no endpoints, changes no app code.
//
// Components:
//   db_lookup     - same SELECT as loginStaff (staff by email), same pool
//                   settings (mysql2, connectionLimit 10). Read-only.
//   bcrypt_compare- bcrypt.compare(password, cost-8 hash) using the backend's
//                   own `bcrypt` package. Cost comes from the stored hash.
//   jwt_sign      - jwt.sign with the same payload shape/expiry as loginStaff
//                   (signing speed is secret-independent; labelled approx).
//
// Method per (component, workers): 5s warmup (discarded) + 30s measurement.
// Workers loop back-to-back (no think time): this is ISOLATED component
// pressure, NOT comparable to API RPS. Component latencies must never be
// summed and presented as end-to-end latency.
//
// Secrets: password/hash read from /tmp files or env, never logged/written
// to the results dir (only hash prefix + cost are recorded).
import fs from 'node:fs';
import path from 'node:path';
import { createPool } from '/home/new-user/hostel-management/backend/node_modules/mysql2/promise.js';
import bcrypt from '/home/new-user/hostel-management/backend/node_modules/bcrypt/bcrypt.js';
import jwt from '/home/new-user/hostel-management/backend/node_modules/jsonwebtoken/index.js';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, arr) => {
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true';
      return [[k, v]];
    }
    return [];
  })
);
const COMPONENT = args.component;
const WORKERS = parseInt(args.workers || '10', 10);
const WARMUP_S = parseFloat(args.warmup || '5');
const MEASURE_S = parseFloat(args.measure || '30');
const OUT = args.out;
const EMAIL = process.env.K6_COST8_EMAIL || 'k6-cost8@hostel.local';
if (!['db_lookup', 'bcrypt_compare', 'jwt_sign'].includes(COMPONENT)) {
  console.error('usage: --component db_lookup|bcrypt_compare|jwt_sign --workers N --out FILE [--warmup 5 --measure 30]');
  process.exit(1);
}

function loadEnv() {
  const cred = {};
  try {
    const text = fs.readFileSync('/home/new-user/hostel-management/backend/.env', 'utf8');
    for (const line of text.split('\n')) {
      const clean = line.replace(/\r/g, '').trim();
      if (/^(DB_|PORT=)/.test(clean) && clean.includes('=')) {
        const [k, ...rest] = clean.split('=');
        cred[k] = rest.join('=');
      }
    }
  } catch { /* handled below */ }
  return cred;
}
function readSecret(p, envKey) {
  if (process.env[envKey]) return process.env[envKey];
  try { return fs.readFileSync(p, 'utf8').trim(); } catch { return ''; }
}
function pct(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const k = (sorted.length - 1) * p / 100;
  const f = Math.floor(k), c = Math.ceil(k);
  return f === c ? sorted[f] : sorted[f] + (sorted[c] - sorted[f]) * (k - f);
}

const cred = loadEnv();
const pool = createPool({
  host: cred.DB_HOST || 'localhost',
  user: cred.DB_USER,
  password: cred.DB_PASSWORD,
  database: cred.DB_NAME,
  port: Number(cred.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10, // mirrors backend/src/config/database.ts
  queueLimit: 0,
});

const PASSWORD = readSecret('/tmp/k6cost8pw', 'K6_COST8_PASSWORD');
let STORED_HASH = readSecret('/tmp/k6cost8hash', 'K6_COST8_HASH');
if (COMPONENT !== 'jwt_sign' && !PASSWORD) { console.error('password secret unavailable'); process.exit(1); }
if (COMPONENT === 'bcrypt_compare' && !STORED_HASH) {
  const [rows] = await pool.query('SELECT password_hash FROM staff WHERE email = ?', [EMAIL]);
  STORED_HASH = rows[0]?.password_hash || '';
}
if (COMPONENT === 'bcrypt_compare' && !STORED_HASH) { console.error('hash unavailable'); process.exit(1); }
const hashCost = COMPONENT === 'bcrypt_compare' ? bcrypt.getRounds(STORED_HASH) : null;
const hashPrefix = COMPONENT === 'bcrypt_compare' ? STORED_HASH.slice(0, 7) : null;

const JWT_SECRET = process.env.JWT_SECRET || 'hostel_management_super_secret_key_2026'; // same fallback as auth.controller
const jwtPayload = { staff_id: 999999, name: 'k6 Cost8 Isolated', email: EMAIL, role: 'MAINTENANCE_STAFF' };

async function opDb() {
  const [rows] = await pool.query(
    'SELECT staff_id, name, email, password_hash, phone, role, status FROM staff WHERE email = ?',
    [EMAIL]
  );
  if (!rows.length) throw new Error('test account missing');
}
async function opBcrypt() { await bcrypt.compare(PASSWORD, STORED_HASH); }
async function opJwt() {
  jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '24h' });
}
const OP = COMPONENT === 'db_lookup' ? opDb : COMPONENT === 'bcrypt_compare' ? opBcrypt : opJwt;

async function worker(deadline, lat, errs, timeouts) {
  while (Date.now() < deadline) {
    const t0 = performance.now();
    try {
      await OP();
      const dt = performance.now() - t0;
      if (dt >= 15000) timeouts.n += 1;
      lat.push(dt);
    } catch {
      errs.n += 1;
    }
  }
}

async function runPhase(seconds) {
  const lat = [];
  const errs = { n: 0 };
  const timeouts = { n: 0 };
  const deadline = Date.now() + seconds * 1000;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, () => worker(deadline, lat, errs, timeouts)));
  const wallS = (Date.now() - t0) / 1000;
  return { lat, errors: errs.n, timeouts: timeouts.n, wallS };
}

await runPhase(WARMUP_S); // stabilize, discard
const { lat, errors, timeouts, wallS } = await runPhase(MEASURE_S);
lat.sort((a, b) => a - b);
const sum = lat.reduce((a, b) => a + b, 0);
const result = {
  component: COMPONENT,
  workers: WORKERS,
  bcrypt_cost: COMPONENT === 'bcrypt_compare' ? hashCost : 8,
  hash_prefix: hashPrefix,
  method: 'isolated closed-loop, 5s warmup discarded + 30s measurement, no think time',
  total_requests: lat.length + errors,
  successful_requests: lat.length,
  failed_requests: errors,
  error_rate: (lat.length + errors) ? errors / (lat.length + errors) : null,
  timeout_count: timeouts.n,
  throughput_rps: wallS ? (lat.length + errors) / wallS : null,
  latency_ms: {
    avg: lat.length ? sum / lat.length : null,
    min: lat.length ? lat[0] : null,
    p50: pct(lat, 50),
    p90: pct(lat, 90),
    p95: pct(lat, 95),
    max: lat.length ? lat[lat.length - 1] : null,
  },
  note: 'Isolated component timing. Do NOT sum with other components as end-to-end latency.',
};
await pool.end();
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
}
console.log(JSON.stringify(result));
