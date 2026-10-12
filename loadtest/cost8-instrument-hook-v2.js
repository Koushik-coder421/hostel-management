// Test-only in-handler timing hook v2 (NEW FILE): times bcrypt.compare, pool.query
// (DB segments) and buildUserScope (scope segment) inside the real sign-in handler.
// Loaded via `node -r ... dist/app.js` on a separate port; production files untouched.
// Auth behavior unchanged: all wrappers call through and return results untouched.
// Logs: $BCRYPT_TIMING_LOG, $DB_TIMING_LOG, $SCOPE_TIMING_LOG (JSON lines, durations only).
const Module = require('module');
const fs = require('fs');

const BLOG = process.env.BCRYPT_TIMING_LOG || '/tmp/bcrypt-timing.jsonl';
const DLOG = process.env.DB_TIMING_LOG || '/tmp/db-timing.jsonl';
const SLOG = process.env.SCOPE_TIMING_LOG || '/tmp/scope-timing.jsonl';

function log(file, obj) {
  try { fs.appendFileSync(file, JSON.stringify(obj) + '\n'); } catch { /* never break auth */ }
}

function wrapCompare(orig) {
  return function (pw, hash, ...rest) {
    const t0 = performance.now();
    const done = (r) => { log(BLOG, { t: new Date().toISOString(), dur_ms: performance.now() - t0 }); return r; };
    if (rest.length && typeof rest[rest.length - 1] === 'function') {
      const cb = rest.pop();
      return orig.call(this, pw, hash, ...rest, function (...a) { done(true); return cb.apply(this, a); });
    }
    return Promise.resolve(orig.call(this, pw, hash, ...rest)).then(done);
  };
}

function wrapQuery(orig) {
  return function (...args) {
    const t0 = performance.now();
    const sql = typeof args[0] === 'string' ? args[0].slice(0, 60) : '?';
    const done = (r) => { log(DLOG, { t: new Date().toISOString(), dur_ms: performance.now() - t0, sql }); return r; };
    const last = args[args.length - 1];
    if (typeof last === 'function') {
      args[args.length - 1] = function (...a) { done(true); return last.apply(this, a); };
      return orig.apply(this, args);
    }
    const out = orig.apply(this, args);
    if (out && typeof out.then === 'function') return out.then(done, (e) => { done(false); throw e; });
    done(true);
    return out;
  };
}

function patchPool(pool) {
  if (pool && !pool.__timed && typeof pool.query === 'function') {
    pool.query = wrapQuery(pool.query.bind(pool));
    Object.defineProperty(pool, '__timed', { value: true });
  }
  return pool;
}

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const mod = origLoad.apply(this, arguments);
  try {
    if ((request === 'bcrypt' || String(request).endsWith('/bcrypt') || String(request).endsWith('bcrypt.js')) && mod && !mod.__timed) {
      mod.compare = wrapCompare(mod.compare.bind(mod));
      Object.defineProperty(mod, '__timed', { value: true });
    }
    if (String(request).includes('mysql2/promise') && mod && mod.createPool && !mod.__poolTimed) {
      const origCreate = mod.createPool;
      mod.createPool = (...a) => patchPool(origCreate(...a));
      Object.defineProperty(mod, '__poolTimed', { value: true });
    }
    if (String(request).endsWith('utils/scope') && mod && mod.buildUserScope && !mod.__scopeTimed) {
      const orig = mod.buildUserScope;
      mod.buildUserScope = async (...a) => {
        const t0 = performance.now();
        try { return await orig(...a); }
        finally { log(SLOG, { t: new Date().toISOString(), dur_ms: performance.now() - t0 }); }
      };
      Object.defineProperty(mod, '__scopeTimed', { value: true });
    }
  } catch { /* leave module untouched on any error */ }
  return mod;
};
