#!/usr/bin/env python3
"""Build verification report tables from loadtest/test-results-cost8-20261012/ (NEW FILE).
Reads full-signin-*-k6summary.json, component-*.json, cpu-*.csv. Prints markdown tables.
"""
import json, csv, glob, os, statistics

RDIR = "loadtest/test-results-cost8-20261012"

def k6_row(vu):
    with open(f"{RDIR}/full-signin-{vu}vu-k6summary.json") as f:
        d = json.load(f)
    m = d["metrics"]  # summary-export format: values are flat, no wrapper
    dur = m["http_req_duration"]
    reqs = m["http_reqs"]
    failed = m["http_req_failed"]  # passes=failed count, fails=ok count (k6 Rate convention)
    login_failed = m.get("login_failed", {}).get("value", 0)
    to = m.get("timeout_total", {}).get("count", 0) or 0
    s200 = m.get("status_200_total", {}).get("count", 0) or 0
    s401 = m.get("status_401_total", {}).get("count", 0) or 0
    soth = m.get("status_other_total", {}).get("count", 0) or 0
    return {
        "vu": vu, "p50": dur.get("med", dur.get("p(50)")), "p90": dur.get("p(90)"), "p95": dur.get("p(95)"),
        "avg": dur.get("avg"), "min": dur.get("min"), "max": dur.get("max"),
        "total": reqs.get("count"), "ok": s200, "fail": failed.get("passes"),
        "rps": reqs.get("rate"), "err": failed.get("value"), "timeouts": to,
        "s401": s401, "soth": soth, "login_fail_rate": login_failed,
    }

def comp_row(name, vu):
    with open(f"{RDIR}/component-{name}-{vu}vu.json") as f:
        d = json.load(f)
    L = d["latency_ms"]
    return {"vu": vu, "p50": L["p50"], "p90": L["p90"], "p95": L["p95"],
            "avg": L["avg"], "min": L["min"], "max": L["max"],
            "total": d["total_requests"], "ok": d["successful_requests"],
            "fail": d["failed_requests"], "rps": d["throughput_rps"],
            "err": d["error_rate"], "timeouts": d.get("timeout_count", 0)}

def cpu_stats(path):
    rows = []
    try:
        with open(path) as f:
            for r in csv.DictReader(f):
                rows.append(r)
    except FileNotFoundError:
        return None
    def col(k):
        return [float(r[k]) for r in rows if r.get(k) not in (None, "", "None")]
    def f(x): return round(x, 2) if x is not None else None
    be, my, cm = col("backend_cpu"), col("mysql_cpu"), col("core_max_busy")
    rss = col("backend_rss_kb")
    return {"n": len(rows),
            "be_min": f(min(be)) if be else None, "be_avg": f(statistics.fmean(be)) if be else None,
            "be_max": f(max(be)) if be else None,
            "my_avg": f(statistics.fmean(my)) if my else None,
            "core_max": f(max(cm)) if cm else None,
            "rss_max": int(max(rss)) if rss else None}

def fmt(x, nd=1):
    return f"{x:.{nd}f}" if isinstance(x, (int, float)) else ""

print("## full sign-in")
for vu in (10, 25, 50, 100):
    r = k6_row(vu)
    print(f"| {vu} | {fmt(r['p50'])} | {fmt(r['p90'])} | {fmt(r['p95'])} | {fmt(r['avg'])} | {fmt(r['min'])} | {fmt(r['max'])} | {r['total']} | {r['ok']} | {r['fail']} | {fmt(r['rps'],2)} | {fmt((r['err'] or 0)*100,2)}% | {r['timeouts']} | 401:{r['s401']} other:{r['soth']} |")
print("## components")
for name in ("db_lookup", "bcrypt_compare", "jwt_sign"):
    print(f"### {name}")
    for vu in (10, 25, 50, 100):
        r = comp_row(name, vu)
        print(f"| {vu} | {fmt(r['p50'],3 if name!='bcrypt_compare' else 1)} | {fmt(r['p90'],3 if name!='bcrypt_compare' else 1)} | {fmt(r['p95'],3 if name!='bcrypt_compare' else 1)} | {fmt(r['avg'],3 if name!='bcrypt_compare' else 1)} | {r['total']} | {r['fail']} | {fmt(r['rps'],1)} | {r['timeouts']} |")
print("## cpu")
for vu in (10, 25, 50, 100):
    for kind in [f"cpu-full-signin-{vu}vu.csv", f"cpu-component-db_lookup-{vu}vu.csv",
                 f"cpu-component-bcrypt_compare-{vu}vu.csv", f"cpu-component-jwt_sign-{vu}vu.csv"]:
        s = cpu_stats(f"{RDIR}/{kind}")
        print(f"{kind}: {s}")
