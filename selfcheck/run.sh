#!/usr/bin/env bash
# ============================================================
# selfcheck.sh — 真实流量自检服务运维脚本
# 用法:
#   bash selfcheck/run.sh start [--port 8090]   常驻启动（后台）
#   bash selfcheck/run.sh stop                  停止
#   bash selfcheck/run.sh status                存活 + 最近自检摘要
#   bash selfcheck/run.sh run [--tag api]       一次性触发并等待结果
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT=8090
PID_FILE="$ROOT/selfcheck/.pid"

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}v${NC} $1"; }
fail() { echo -e "  ${RED}x${NC} $1"; }
info() { echo -e "  ${CYAN}>${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

BASE_URL="http://localhost:$PORT"

is_up() {
  curl -sf "$BASE_URL/healthz" > /dev/null 2>&1
}

# ── start ──────────────────────────────────────────────
do_start() {
  if is_up; then
    ok "自检服务已在运行 ($BASE_URL)"
    return 0
  fi
  info "启动自检服务 (port=$PORT) ..."
  nohup python3 "$ROOT/selfcheck/service.py" --port "$PORT" \
    > "$ROOT/selfcheck/server.log" 2>&1 &
  echo $! > "$PID_FILE"
  # 等待就绪（最多 10s）
  for _ in $(seq 1 20); do
    if is_up; then
      ok "自检服务就绪 (pid=$(cat "$PID_FILE"))"
      return 0
    fi
    sleep 0.5
  done
  fail "自检服务启动超时，查看 $ROOT/selfcheck/server.log"
  return 1
}

# ── stop ───────────────────────────────────────────────
do_stop() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
    ok "自检服务已停止"
  else
    warn "自检服务未在运行"
  fi
}

# ── status ─────────────────────────────────────────────
do_status() {
  if ! is_up; then
    fail "自检服务离线 ($BASE_URL)"
    return 1
  fi
  ok "自检服务在线 ($BASE_URL)"
  summary=$(curl -sf "$BASE_URL/selfcheck/summary" || echo '{"hasReport":false}')
  if echo "$summary" | grep -q '"hasReport":true'; then
    echo "$summary" | python3 -c '
import json,sys
d=json.load(sys.stdin)
s=d.get("summary",{})
print("    最近: %s  总数%d 通过%d 失败%d 通过率%s%%" % (d["status"], s.get("total",0), s.get("passed",0), s.get("failed",0), s.get("passRate",0)))
'
  else
    warn "尚无自检报告（POST /selfcheck/run 触发）"
  fi
}

# ── run（一次性触发并等待）────────────────────────────
do_run() {
  local tag="${1:-all}"
  if ! is_up; then
    info "自检服务未运行，先启动..."
    do_start || return 1
  fi
  info "触发自检 (tag=$tag) ..."
  resp=$(curl -sf -X POST "$BASE_URL/selfcheck/run" \
    -H 'Content-Type: application/json' \
    -d "{\"tag\": \"$tag\"}") || { fail "触发失败"; return 1; }
  job_id=$(echo "$resp" | python3 -c 'import json,sys; print(json.load(sys.stdin)["jobId"])')
  ok "任务已提交: $job_id"

  # 轮询等待完成
  for _ in $(seq 1 120); do
    st=$(curl -sf "$BASE_URL/selfcheck/status/$job_id" | python3 -c 'import json,sys; print(json.load(sys.stdin)["status"])')
    if [ "$st" = "done" ] || [ "$st" = "failed" ]; then
      break
    fi
    sleep 1
  done

  curl -sf "$BASE_URL/selfcheck/status/$job_id" | python3 -c '
import json,sys
d=json.load(sys.stdin)
err = d.get("error") or "无"
print("    状态: " + d["status"] + "  error: " + err)
'
  latest=$(curl -sf "$BASE_URL/selfcheck/latest")
  echo "$latest" | python3 -c '
import json,sys
d=json.load(sys.stdin)
s=d["report"]["summary"]
print("    结果: 总数%d 通过%d 失败%d 警告%d 通过率%s%%" % (s["total"], s["passed"], s["failed"], s["warned"], s["passRate"]))
for r in d["report"]["results"]:
    if r["status"] == "fail":
        print("      x " + r["method"] + " " + r["url"] + ": " + r["detail"])
'
  st=$(echo "$latest" | python3 -c 'import json,sys; print(json.load(sys.stdin)["report"]["summary"]["failed"])')
  [ "$st" = "0" ] && ok "自检全部通过" || { fail "存在失败项"; return 1; }
}

# ── 参数解析 ──────────────────────────────────────────
ACTION="${1:-start}"; shift || true
TAG="all"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --tag)  TAG="$2"; shift 2 ;;
    *) warn "未知参数: $1"; shift ;;
  esac
done
BASE_URL="http://localhost:$PORT"

case "$ACTION" in
  start)  do_start ;;
  stop)   do_stop ;;
  status) do_status ;;
  run)    do_run "$TAG" ;;
  *) echo "用法: $0 {start|stop|status|run} [--port N] [--tag T]"; exit 1 ;;
esac
