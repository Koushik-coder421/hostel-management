#!/bin/bash
# Server-side load monitor for the 100-VU k6 run.
# Samples every 2s: backend Node CPU/mem, MySQL CPU/mem, MySQL connections,
# overall CPU/mem, and DB query latency (SELECT 1). Read-only, non-destructive.
# Usage: ./monitor.sh <output_csv>  (run in background during k6, then kill)
set -u
OUT="${1:-loadtest/monitor.csv}"

BACKEND_PID=$(pgrep -f "node /home/new-user/hostel-management/backend/dist/app.js" | head -n1)
MYSQL_PID=$(pgrep -x mysqld | head -n1 || pgrep -f mysqld | head -n1)

# DB creds from backend .env (CRLF-safe), used read-only
ENVF="$HOME/hostel-management/backend/.env"
clean() { tr -d '\r' < "$ENVF" | grep "^$1=" | cut -d= -f2-; }
DB_HOST=$(clean DB_HOST); DB_PORT=$(clean DB_PORT); DB_USER=$(clean DB_USER)
DB_PASSWORD=$(clean DB_PASSWORD); DB_NAME=$(clean DB_NAME)

echo "ts,backend_pid,backend_cpu_pct,backend_mem_rss_kb,mysql_pid,mysql_cpu_pct,mysql_mem_rss_kb,overall_cpu_pct,overall_mem_used_kb,overall_mem_total_kb,mysql_threads_connected,mysql_processlist_count,db_select1_ms" > "$OUT"
echo "backend_pid=$BACKEND_PID mysql_pid=$MYSQL_PID -> $OUT" >&2

sample_cpu() { # $1=pid -> %cpu (best effort via ps)
  ps -p "$1" -o %cpu= 2>/dev/null | tr -d ' ' || echo ""
}
sample_rss() { # $1=pid -> RSS KB
  ps -p "$1" -o rss= 2>/dev/null | tr -d ' ' || echo ""
}

while true; do
  TS=$(date -u +%FT%TZ)
  B_CPU=$(sample_cpu "$BACKEND_PID"); B_RSS=$(sample_rss "$BACKEND_PID")
  M_CPU=$(sample_cpu "$MYSQL_PID"); M_RSS=$(sample_rss "$MYSQL_PID")
  # overall
  read -r CPU_IDLE CPU_TOTAL <<<"$(awk '/^cpu /{idle=$5; total=$2+$3+$4+$5+$6+$7+$8; print idle, total}' /proc/stat)"
  sleep 1
  read -r CPU_IDLE2 CPU_TOTAL2 <<<"$(awk '/^cpu /{idle=$5; total=$2+$3+$4+$5+$6+$7+$8; print idle, total}' /proc/stat)"
  OVERALL_CPU=$(awk "BEGIN{dT=$CPU_TOTAL2-$CPU_TOTAL; dI=$CPU_IDLE2-$CPU_IDLE; if(dT>0) printf \"%.1f\", (1-dI/dT)*100; else print \"\"}")
  MEM_TOTAL=$(awk '/MemTotal/{print $2}' /proc/meminfo)
  MEM_AVAIL=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
  MEM_USED=$((MEM_TOTAL - MEM_AVAIL))
  # mysql (read-only status)
  THR=""; PLIST=""; QMS=""
  if [ -n "$DB_USER" ]; then
    T0=$(date +%s%3N)
    ROW=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -Nse "SELECT 1; " 2>/dev/null)
    T1=$(date +%s%3N); [ -n "$ROW" ] && QMS=$((T1 - T0))
    THR=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -Nse "SHOW STATUS LIKE 'Threads_connected';" 2>/dev/null | awk '{print $2}')
    PLIST=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -Nse "SELECT COUNT(*) FROM information_schema.PROCESSLIST;" 2>/dev/null)
  fi
  echo "$TS,$BACKEND_PID,$B_CPU,$B_RSS,$MYSQL_PID,$M_CPU,$M_RSS,$OVERALL_CPU,$MEM_USED,$MEM_TOTAL,$THR,$PLIST,$QMS" >> "$OUT"
  sleep 1
done
