#!/usr/bin/env bash
# ============================================================
# deploy-test.sh — 测试环境一键部署脚本
# 一键启动测试环境 + 运行测试 + 巡检
# 用法:
#   bash scripts/deploy-test.sh                # 全量部署 + 测试
#   bash scripts/deploy-test.sh --no-monitor   # 跳过巡检
#   bash scripts/deploy-test.sh --no-test      # 跳过测试
#   bash scripts/deploy-test.sh --quick        # 仅启动服务（跳过构建和测试）
# ============================================================

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}v${NC} $1"; }
fail() { echo -e "  ${RED}x${NC} $1"; }
info() { echo -e "  ${CYAN}>${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

SKIP_MONITOR=false
SKIP_TEST=false
QUICK_MODE=false
RUN_SELFCHECK=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-monitor) SKIP_MONITOR=true; shift ;;
    --no-test)    SKIP_TEST=true; shift ;;
    --quick)      QUICK_MODE=true; shift ;;
    --selfcheck)  RUN_SELFCHECK=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

echo "+-------------------------------------------------------+"
echo "|  Atlas Novel Reader - 测试环境部署脚本                 |"
echo "|  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "+-------------------------------------------------------+"

# ── 前置检查 ──────────────────────────────────────────────
preflight() {
  echo ""
  echo "--- 前置检查 ---"

  command -v node     >/dev/null 2>&1 || { fail "node 未安装"; exit 1; }
  command -v pnpm     >/dev/null 2>&1 || { fail "pnpm 未安装"; exit 1; }
  command -v python3  >/dev/null 2>&1 || { fail "python3 未安装"; exit 1; }

  ok "node $(node -v)"
  ok "pnpm $(pnpm -v)"
  ok "python3 $(python3 --version 2>&1 | awk '{print $2}')"

  # 安装前端依赖
  if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    pnpm install
    ok "前端依赖安装完成"
  fi

  # 安装后端依赖
  if ! python3 -c "import fastapi" 2>/dev/null; then
    info "安装后端依赖..."
    pip install -e "backend/.[dev]" --break-system-packages -q
    ok "后端依赖安装完成"
  fi

  ok "前置检查通过"
}

# ── 构建 packages ──────────────────────────────────────────
build_packages() {
  echo ""
  echo "--- 构建 Packages ---"

  pnpm -r --filter=./packages/* run build
  ok "packages 构建完成"
}

# ── 启动后端 ──────────────────────────────────────────────
start_backend() {
  echo ""
  echo "--- 启动后端 ---"

  export DEBUG=true
  # 测试环境使用独立数据库，避免触碰主库 novel.db
  export DB_URL="${DB_URL:-sqlite+aiosqlite:///novel-test.db}"
  export JWT_SECRET="${JWT_SECRET:-test-jwt-secret-key-at-least-32-chars!!}"

  info "启动后端服务 (port 8000, DB: $DB_URL)..."
  cd "$ROOT/backend"
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
  BACKEND_PID=$!
  echo "  PID: $BACKEND_PID"
  cd "$ROOT"

  # 等待后端就绪
  for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
      ok "后端服务就绪 (${i}s)"
      break
    fi
    sleep 1
  done
  if ! curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    fail "后端服务启动超时"
    exit 1
  fi
}

# ── 启动前端 ──────────────────────────────────────────────
start_frontend() {
  echo ""
  echo "--- 启动前端 ---"

  info "启动 C 端 (port 5173)..."
  cd "$ROOT/apps/web"
  pnpm dev &
  WEB_PID=$!
  echo "  PID: $WEB_PID"
  cd "$ROOT"

  info "启动 B 端 (port 5174)..."
  cd "$ROOT/apps/admin"
  pnpm dev &
  ADMIN_PID=$!
  echo "  PID: $ADMIN_PID"
  cd "$ROOT"

  sleep 5

  if curl -sf http://localhost:5173 > /dev/null 2>&1; then
    ok "C 端就绪 (http://localhost:5173)"
  else
    warn "C 端尚未完全就绪（可能仍在编译）"
  fi

  if curl -sf http://localhost:5174 > /dev/null 2>&1; then
    ok "B 端就绪 (http://localhost:5174)"
  else
    warn "B 端尚未完全就绪（可能仍在编译）"
  fi
}

# ── 运行测试 ──────────────────────────────────────────────
run_tests() {
  echo ""
  echo "--- 运行测试 ---"

  info "后端测试..."
  python3 "$ROOT/backend/scripts/test-platform/run.py" --full 2>&1 | tail -3
  ok "后端测试完成"

  info "前端测试..."
  pnpm --filter @novel/web exec vitest run --no-coverage 2>&1 | tail -3
  ok "前端测试完成"

  info "TypeScript 类型检查..."
  pnpm run typecheck 2>&1 | tail -1
  ok "TypeScript 类型检查通过"

  info "ESLint 检查..."
  pnpm run lint 2>&1 | tail -3
  ok "ESLint 检查通过"

  info "Ruff 代码检查..."
  ruff check "$ROOT/backend/app/" "$ROOT/backend/tests/" 2>&1 | tail -1
  ok "Ruff 检查通过"
}

# ── 运行全局真实请求检查 ─────────────────────────────────
run_global_check() {
  echo ""
  echo "--- 全局真实请求检查 ---"

  python3 "$ROOT/scripts/global-check/global_check.py" \
    --report "$ROOT/global-check-report.json" 2>&1 | tail -30 || true
  ok "全局真实请求检查完成（报告: $ROOT/global-check-report.json）"
}

# ── 运行巡检 ──────────────────────────────────────────────
run_monitor() {
  echo ""
  echo "--- 运行 Playwright 巡检 ---"

  if command -v npx &>/dev/null && [ -d "$ROOT/node_modules" ]; then
    # 检查浏览器是否安装
    if [ ! -d "/root/.cache/ms-playwright/chromium-1234" ]; then
      info "安装 Playwright 浏览器..."
      PLAYWRIGHT_DOWNLOAD_HOST="https://registry.npmmirror.com/-/binary/playwright" \
        npx playwright install chromium 2>/dev/null
      ok "Playwright 浏览器安装完成"
    fi

    npx playwright test --config="$ROOT/monitoring/playwright.config.ts" 2>&1 | tail -3
    ok "Playwright 巡检完成"
  else
    warn "npx 不可用，跳过巡检"
  fi
}

# ── 运行真实流量自检服务 ────────────────────────────────
run_selfcheck() {
  echo ""
  echo "--- 真实流量自检服务 ---"

  bash "$ROOT/selfcheck/run.sh" start --port 8090
  if bash "$ROOT/selfcheck/run.sh" run --tag all --port 8090; then
    ok "真实流量自检全部通过"
  else
    warn "自检存在失败项（详见 selfcheck/run.sh run 输出）"
  fi
}

# ── 清理 ──────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "--- 清理 ---"
  info "停止后台服务..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$WEB_PID" 2>/dev/null || true
  kill "$ADMIN_PID" 2>/dev/null || true
  ok "服务已停止"
}

trap cleanup EXIT

# ── 主流程 ──────────────────────────────────────────────
main() {
  preflight

  if [ "$QUICK_MODE" = false ]; then
    build_packages
  fi

  start_backend
  start_frontend

  echo ""
  echo "================================================"
  echo "  测试环境已启动"
  echo "================================================"
  echo "  后端 API:  http://localhost:8000"
  echo "  API 文档:  http://localhost:8000/docs"
  echo "  C 端:      http://localhost:5173"
  echo "  B 端:      http://localhost:5174"
  echo "================================================"

  if [ "$QUICK_MODE" = false ]; then
    if [ "$SKIP_TEST" = false ]; then
      run_tests
    fi
    if [ "$SKIP_MONITOR" = false ]; then
      run_global_check
      run_monitor
    fi
    if [ "$RUN_SELFCHECK" = true ]; then
      run_selfcheck
    fi
  fi

  echo ""
  echo "================================================"
  echo "  全部完成"
  echo "================================================"
}

main