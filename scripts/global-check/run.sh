#!/usr/bin/env bash
# ============================================================
# global-check.sh — 全局真实请求检查（端到端冒烟测试）
# 通过真实 HTTP 请求遍历后端 OpenAPI 全部端点 + 前端页面，
# 校验统一响应格式，输出 JSON 报告。覆盖现有 monitoring 检查
# 未触及的端点，作为部署/巡检前的快速全链路确认。
#
# 用法:
#   bash scripts/global-check/run.sh                  # 全量（api + pages）
#   bash scripts/global-check/run.sh --tag api        # 仅 API 检查
#   bash scripts/global-check/run.sh --tag pages      # 仅页面检查
#   bash scripts/global-check/run.sh --report out.json
#   bash scripts/global-check/run.sh --keep-running   # 不停止已启动的服务
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

BACKEND="${BACKEND:-http://localhost:8000}"
WEB="${WEB:-http://localhost:5173}"
ADMIN="${ADMIN:-http://localhost:5174}"
TAG="all"
REPORT="global-check-report.json"
KEEP_RUNNING=false
REPORT_DIR="$ROOT/scripts/global-check/reports"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)     TAG="$2"; shift 2 ;;
    --report)  REPORT="$2"; shift 2 ;;
    --keep-running) KEEP_RUNNING=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}v${NC} $1"; }
fail() { echo -e "  ${RED}x${NC} $1"; }
info() { echo -e "  ${CYAN}>${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

mkdir -p "$REPORT_DIR"

# ── 服务预检 ──────────────────────────────────────────────
check_service() {
  local name=$1 url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    ok "$name 在线 ($url)"
    return 0
  else
    warn "$name 离线 ($url)"
    return 1
  fi
}

# ── 启动服务（若未运行）─────────────────────────────────
ensure_services() {
  local backend_up=true web_up=true admin_up=true
  check_service "后端" "$BACKEND/health" || backend_up=false
  check_service "C 端" "$WEB" || web_up=false
  check_service "B 端" "$ADMIN" || admin_up=false

  if [ "$backend_up" = true ] && [ "$web_up" = true ] && [ "$admin_up" = true ]; then
    info "全部服务已在线，直接执行检查"
    return 0
  fi

  if [ "$KEEP_RUNNING" = true ]; then
    fail "存在离线服务且 --keep-running 已设置，跳过自动启动"
    exit 1
  fi

  info "检测到离线服务，自动启动测试环境..."
  bash "$ROOT/scripts/deploy-test.sh" --quick
  info "等待服务就绪..."
  sleep 5

  backend_up=false
  curl -sf "$BACKEND/health" > /dev/null 2>&1 && backend_up=true
  if [ "$backend_up" = false ]; then
    fail "后端启动失败"
    exit 1
  fi
  ok "后端就绪"
}

# ── 主流程 ──────────────────────────────────────────────
echo "+-------------------------------------------------------+"
echo "|  全局真实请求检查（端到端冒烟测试）                     |"
echo "|  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "+-------------------------------------------------------+"

ensure_services

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FULL_REPORT="$REPORT_DIR/$TIMESTAMP.json"

info "运行检查 (tag=$TAG) ..."
set +e
python3 "$ROOT/scripts/global-check/global_check.py" \
  --backend "$BACKEND" --web "$WEB" --admin "$ADMIN" \
  --tag "$TAG" --report "$FULL_REPORT" 2>&1
EXIT_CODE=$?
set -e

if [[ "$REPORT" != /* ]]; then
  cp "$FULL_REPORT" "$ROOT/$REPORT"
  REPORT_PATH="$ROOT/$REPORT"
else
  cp "$FULL_REPORT" "$REPORT"
  REPORT_PATH="$REPORT"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  ok "全局检查通过，报告: $REPORT_PATH"
else
  fail "全局检查存在失败项，报告: $REPORT_PATH"
fi

exit $EXIT_CODE
