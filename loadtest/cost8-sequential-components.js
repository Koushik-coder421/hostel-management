// Sequential isolated component benchmarks @ cost 8 (TEST-ONLY, NEW FILE).
// Mirrors the cost-10 report §2 method: fixed sequential samples, no concurrency.
// db n=500, bcrypt n=100, scope n=200, jwt n=1000. Read-only. Secrets via /tmp files/env.
const fs = require('fs');
const { createPool } = require('/home/new-user/hostel-management/backend/node_modules/mysql2/promise.js');
const bcrypt = require('/home/new-user/hostel-management/backend/node_modules/bcrypt/bcrypt.js');
const jwt = require('/home/new-user/hostel-management/backend/node_modules/jsonwebtoken/index.js');
const { buildUserScope } = require('/home/new-user/hostel-management/backend/dist/utils/scope.js');

function loadEnv() {
  const c = {};
  for (const line of fs.readFileSync('/home/new-user/hostel-management/backend/.env', 'utf8').split('\n')) {
    const cl = line.replace(/\r/g, '').trim();
    if (/^(DB_)/.test(cl) && cl.includes('=')) { const i = cl.indexOf('='); c[cl.slice(0, i)] = cl.slice(i + 1); }
  }
  return c;
}
const cred = loadEnv();
const pool = createPool({
  host: cred.DB_HOST || 'localhost', user: cred.DB_USER, password: cred.DB_PASSWORD,
  database: cred.DB_NAME, port: Number(cred.DB_PORT) || 3306,
  waitForConnections: true, connectionLimit: 10, queueLimit: 0,
});
const EMAIL = process.env.K6_COST8_EMAIL || 'k6-cost8@hostel.local';
const PW = (process.env.K6_COST8_PASSWORD || fs.readFileSync('/tmp/k6cost8pw', 'utf8')).trim();

function stats(name, n, arr) {
  const s = [...arr].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))];
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  console.log(`${name} (n=${n}): avg=${avg.toFixed(3)}ms p50=${q(50).toFixed(3)} p90=${q(90).toFixed(3)} p95=${q(95).toFixed(3)} min=${s[0].toFixed(3)} max=${s[s.length-1].toFixed(3)}`);
  return { avg, p50: q(50), p90: q(90), p95: q(95), min: s[0], max: s[s.length - 1] };
}

(async () => {
  const out = {};
  let a = [];
  for (let i = 0; i < 500; i++) {
    const t0 = performance.now();
    await pool.query('SELECT staff_id, name, email, password_hash, phone, role, status FROM staff WHERE email = ?', [EMAIL]);
    a.push(performance.now() - t0);
  }
  out.db = stats('db_lookup', 500, a);

  const [rows] = await pool.query('SELECT password_hash FROM staff WHERE email = ?', [EMAIL]);
  const hash = rows[0].password_hash;
  console.log('hash_cost=' + bcrypt.getRounds(hash) + ' prefix=' + hash.slice(0, 7));
  a = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    await bcrypt.compare(PW, hash);
    a.push(performance.now() - t0);
  }
  out.bcrypt = stats('bcrypt_compare', 100, a);

  const staff = { staff_id: 999999, email: EMAIL, phone: '9000000080', role: 'MAINTENANCE_STAFF' };
  a = [];
  for (let i = 0; i < 200; i++) {
    const t0 = performance.now();
    await buildUserScope(staff);
    a.push(performance.now() - t0);
  }
  out.scope = stats('buildUserScope', 200, a);

  const secret = process.env.JWT_SECRET || 'hostel_management_super_secret_key_2026';
  const payload = { staff_id: 999999, name: 'k6 Cost8 Isolated', email: EMAIL, role: 'MAINTENANCE_STAFF' };
  a = [];
  for (let i = 0; i < 1000; i++) {
    const t0 = performance.now();
    jwt.sign(payload, secret, { expiresIn: '24h' });
    a.push(performance.now() - t0);
  }
  out.jwt = stats('jwt_sign', 1000, a);
  await pool.end();
  fs.writeFileSync(process.argv[2] || '/tmp/cost8-sequential.json', JSON.stringify(out, null, 2));
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
