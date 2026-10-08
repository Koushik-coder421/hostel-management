#!/usr/bin/env python3
"""Improved read-only load monitor (v2).
- Per-process CPU via /proc/<pid>/stat deltas (reliable, no ps-average issue).
- Backend + MySQL RSS, overall CPU/mem.
- MySQL Threads_connected + PROCESSLIST count (read-only).
- GET / latency as event-loop proxy (no DB/bcrypt, non-invasive).
- SELECT 1 latency via accurate python timer (replaces invalid db_select1_ms).
- performance_schema digest NOT accessible with hostel_app (permission denied);
  recorded as unavailable instead of inventing data.
Usage: monitor2.py <output_csv>  (Ctrl-C / kill to stop)
"""
import csv, os, sys, time, json, urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else "loadtest/monitor.csv"
BACKEND_PID = int(os.environ.get("BACKEND_PID", "0") or 0)
MYSQL_PID = int(os.environ.get("MYSQL_PID", "0") or 0)
BASE_URL = os.environ.get("BASE_URL", "http://localhost:5000")

def detect_pids():
    import subprocess
    global BACKEND_PID, MYSQL_PID
    if not BACKEND_PID:
        try:
            out = subprocess.check_output(
                ["pgrep", "-f", "backend/dist/app.js"], text=True)
            BACKEND_PID = int(out.strip().split()[0])
        except Exception:
            pass
    if not MYSQL_PID:
        try:
            out = subprocess.check_output(["pgrep", "-x", "mysqld"], text=True)
            MYSQL_PID = int(out.strip().split()[0])
        except Exception:
            try:
                out = subprocess.check_output(
                    ["pgrep", "-f", "mysqld"], text=True)
                MYSQL_PID = int(out.strip().split()[0])
            except Exception:
                pass

def proc_times(pid):
    """Return (utime+stime) in jiffies for pid, or None."""
    try:
        with open(f"/proc/{pid}/stat") as f:
            p = f.read().rsplit(")", 1)[1].split()
            utime = int(p[11]); stime = int(p[12])
            return utime + stime
    except Exception:
        return None

def proc_rss_kb(pid):
    try:
        with open(f"/proc/{pid}/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1])
    except Exception:
        return None
    return None

def total_cpu_jiffies():
    with open("/proc/stat") as f:
        for line in f:
            if line.startswith("cpu "):
                p = line.split()
                return sum(int(x) for x in p[1:8])
    return None

def mem_info():
    total = avail = None
    with open("/proc/meminfo") as f:
        for line in f:
            if line.startswith("MemTotal:"): total = int(line.split()[1])
            elif line.startswith("MemAvailable:"): avail = int(line.split()[1])
    return total, (total - avail) if total and avail else (total, None)

def get_root_ms(timeout=5):
    t0 = time.time()
    try:
        with urllib.request.urlopen(BASE_URL + "/", timeout=timeout) as r:
            r.read()
        return (time.time() - t0) * 1000.0
    except Exception:
        return None

# Lazy mysql connection (read-only status queries)
_mydb = None
def mysql_status():
    """Returns (threads_connected, processlist_count, select1_ms)."""
    global _mydb
    try:
        import mysql.connector  # may not exist; fallback below
    except ImportError:
        return _mysql_cli_status()
    return _mysql_cli_status()

def _mysql_cli_status():
    import subprocess
    envf = os.path.expanduser("~/hostel-management/backend/.env")
    cred = {}
    try:
        with open(envf, "r", encoding="utf-8", errors="replace") as f:
            for line in f.read().splitlines():
                line = line.strip().strip("\r")
                if line.startswith("DB_") and "=" in line:
                    k, v = line.split("=", 1)
                    cred[k] = v
    except Exception:
        return None, None, None
    def q(sql):
        try:
            out = subprocess.check_output(
                ["mysql", "-h", cred.get("DB_HOST", "localhost"),
                 "-P", cred.get("DB_PORT", "3306"),
                 "-u", cred.get("DB_USER", ""),
                 "-p" + cred.get("DB_PASSWORD", ""),
                 cred.get("DB_NAME", ""),
                 "-Nse", sql],
                stderr=subprocess.DEVNULL, timeout=8, text=True)
            return out.strip()
        except Exception:
            return None
    thr = q("SHOW STATUS LIKE 'Threads_connected';")
    thr = thr.split()[-1] if thr else None
    pl = q("SELECT COUNT(*) FROM information_schema.PROCESSLIST;")
    t0 = time.time()
    r = q("SELECT 1;")
    sel = (time.time() - t0) * 1000.0 if r is not None else None
    try: thr = int(thr) if thr is not None else None
    except Exception: pass
    try: pl = int(pl) if pl is not None else None
    except Exception: pass
    return thr, pl, sel

def cpu_pct(pid, interval=1.0):
    t1 = proc_times(pid); tot1 = total_cpu_jiffies()
    if t1 is None or tot1 is None: return None
    time.sleep(interval)
    t2 = proc_times(pid); tot2 = total_cpu_jiffies()
    if t2 is None or tot2 is None: return None
    import os as _os
    ncpu = _os.cpu_count() or 1
    dproc = t2 - t1; dtot = tot2 - tot1
    if dtot <= 0: return None
    # % of one core-equivalent scaled to total capacity like pidstat %CPU
    return round(100.0 * dproc / dtot * 1.0, 1)

def main():
    detect_pids()
    print(f"backend_pid={BACKEND_PID} mysql_pid={MYSQL_PID} -> {OUT}",
          flush=True)
    hdr = ["ts", "backend_pid", "backend_cpu_pct", "backend_mem_rss_kb",
           "mysql_pid", "mysql_cpu_pct", "mysql_mem_rss_kb",
           "overall_cpu_pct", "overall_mem_used_kb", "overall_mem_total_kb",
           "mysql_threads_connected", "mysql_processlist_count",
           "select1_ms", "get_root_ms", "perf_schema"]
    # overall cpu baseline
    prev_tot = total_cpu_jiffies(); prev_idle = None
    with open("/proc/stat") as f:
        for line in f:
            if line.startswith("cpu "):
                p = [int(x) for x in line.split()[1:8]]
                prev_idle = p[3]; break
    with open(OUT, "w", newline="") as f:
        w = csv.writer(f); w.writerow(hdr); f.flush()
        # prime per-process counters
        b0 = proc_times(BACKEND_PID); m0 = proc_times(MYSQL_PID)
        t0 = total_cpu_jiffies()
        while True:
            ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            time.sleep(2.0)
            b1 = proc_times(BACKEND_PID); m1 = proc_times(MYSQL_PID)
            t1 = total_cpu_jiffies()
            def pct(a, b, ta, tb):
                if None in (a, b, ta, tb) or (tb - ta) <= 0: return None
                return round(100.0 * (b - a) / (tb - ta), 1)
            b_cpu = pct(b0, b1, t0, t1); m_cpu = pct(m0, m1, t0, t1)
            b0, m0, t0 = b1, m1, t1
            b_rss = proc_rss_kb(BACKEND_PID); m_rss = proc_rss_kb(MYSQL_PID)
            # overall cpu over same window approx via /proc/stat idle delta
            with open("/proc/stat") as sf:
                for line in sf:
                    if line.startswith("cpu "):
                        p = [int(x) for x in line.split()[1:8]]
                        tot = sum(p); idle = p[3]; break
            o_cpu = (round(100.0 * (1 - (idle - prev_idle) / (tot - prev_tot)), 1)
                     if (tot - prev_tot) > 0 else None)
            prev_tot, prev_idle = tot, idle
            mt, mu = mem_info()
            thr, pl, sel = mysql_status()
            groot = get_root_ms()
            row = [ts, BACKEND_PID, b_cpu, b_rss, MYSQL_PID, m_cpu, m_rss,
                   o_cpu, mu, mt, thr, pl,
                   round(sel, 1) if sel else None,
                   round(groot, 1) if groot else None,
                   "unavailable:app_user_denied"]
            with open(OUT, "a", newline="") as f:
                csv.writer(f).writerow(row)

if __name__ == "__main__":
    main()
