// Test-only bcrypt.compare timing hook (NEW FILE — no production code changed).
// Usage: node -r /abs/path/cost8-instrument-hook.js dist/app.js
// Wraps the `bcrypt` package's compare() to append {t, dur_ms} JSON lines to
// $BCRYPT_TIMING_LOG. Authentication behavior is unchanged: the wrapper calls
// through to the original function and returns its result untouched (both
// promise and callback styles). Overhead is two performance.now() calls (~ns).
const Module = require('module');
const fs = require('fs');

const LOG = process.env.BCRYPT_TIMING_LOG || '/tmp/bcrypt-timing.jsonl';

function wrapCompare(orig) {
  return function timedCompare(pw, hash, ...rest) {
    const t0 = performance.now();
    const done = (result) => {
      try {
        fs.appendFileSync(LOG, JSON.stringify({ t: new Date().toISOString(), dur_ms: performance.now() - t0 }) + '\n');
      } catch { /* never break auth on logging failure */ }
      return result;
    };
    if (rest.length && typeof rest[rest.length - 1] === 'function') {
      const cb = rest.pop();
      return orig.call(this, pw, hash, ...rest, function (...args) {
        done(true);
        return cb.apply(this, args);
      });
    }
    return Promise.resolve(orig.call(this, pw, hash, ...rest)).then((r) => done(r));
  };
}

const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const mod = origLoad.apply(this, arguments);
  if ((request === 'bcrypt' || request.endsWith('/bcrypt')) && mod && !mod.__timed) {
    try {
      mod.compare = wrapCompare(mod.compare.bind(mod));
      Object.defineProperty(mod, '__timed', { value: true });
    } catch { /* leave module untouched on any error */ }
  }
  return mod;
};
