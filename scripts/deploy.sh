#!/usr/bin/env bash
# ============================================================
# deploy.sh — 生产环境一键部署脚本
# 用法:
#   bash scripts/deploy.sh                    # 全量部署
#   bash scripts/deploy.sh --skip-build       # 跳过构建（仅重启服务）
#   bash scripts/deploy.sh --skip-backend     # 仅部署前端
#   bash scripts/deploy.sh --skip-frontend    # 仅部署后端
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

SKIP_BUILD=false
SKIP_BACKEND=false
SKIP_FRONTEND=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)    SKIP_BUILD=true; shift ;;
    --skip-backend)  SKIP_BACKEND=true; shift ;;
    --skip-frontend) SKIP_FRONTEND=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

echo "+-------------------------------------------------------+"
echo "|  Atlas Novel Reader - 生产部署脚本                     |"
echo "|  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "+-------------------------------------------------------+"

# ── 前置检查 ──────────────────────────────────────────────
preflight() {
  echo ""
  echo "--- 前置检查 ---"

  command -v node     >/dev/null 2>&1 || { fail "node 未安装"; exit 1; }
  command -v pnpm     >/dev/null 2>&1 || { fail "pnpm 未安装"; exit 1; }
  command -v python3  >/dev/null 2>&1 || { fail "python3 未安装"; exit 1; }
  command -v pip3     >/dev/null 2>&1 || { fail "pip3 未安装"; exit 1; }

  ok "node $(node -v)"
  ok "pnpm $(pnpm -v)"
  ok "python3 $(python3 --version 2>&1 | awk '{print $2}')"

  if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    pnpm install --frozen-lockfile
    ok "前端依赖安装完成"
  fi

  if [ ! -d "backend/.venv" ] && [ ! -f "backend/app/main.py" ]; then
    warn "请确保后端依赖已安装: cd backend && pip install -e ."
  fi

  if [ -z "${JWT_SECRET:-}" ] || [ ${#JWT_SECRET} -lt 32 ]; then
    warn "JWT_SECRET 未设置或不足 32 字节，生成临时密钥（仅用于测试）"
    export JWT_SECRET="deploy-$(openssl rand -hex 16)"
  fi

  ok "前置检查通过"
}

# ── 构建 ──────────────────────────────────────────────────
build_all() {
  echo ""
  echo "--- 构建 ---"

  info "构建 packages..."
  pnpm -r --filter=./packages/* run build
  ok "packages 构建完成"

  info "构建 C 端 (apps/web)..."
  pnpm --filter @novel/web run build
  ok "C 端构建完成"

  info "构建 B 端 (apps/admin)..."
  pnpm --filter @novel/admin run build
  ok "B 端构建完成"
}

# ── 后端部署 ──────────────────────────────────────────────
deploy_backend() {
  echo ""
  echo "--- 后端部署 ---"

  cd "$ROOT/backend"

  if [ ! -d ".venv" ]; then
    info "创建 Python 虚拟环境..."
    python3 -m venv .venv
    ok "虚拟环境创建完成"
  fi

  info "安装后端依赖..."
  .venv/bin/pip install -e ".[dev]" -q
  ok "后端依赖安装完成"

  export DEBUG="${DEBUG:-false}"
  export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
  export DB_URL="${DB_URL:-sqlite+aiosqlite:///novel.db}"

  info "运行数据库迁移..."
  .venv/bin/alembic upgrade head
  ok "数据库迁移完成"

  info "启动后端服务 (port 8000)..."
  .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 &
  BACKEND_PID=$!
  echo "  PID: $BACKEND_PID"

  sleep 2
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    ok "后端服务健康检查通过"
  else
    fail "后端服务启动失败"
    exit 1
  fi

  cd "$ROOT"
}

# ── 前端部署 ──────────────────────────────────────────────
deploy_frontend() {
  echo ""
  echo "--- 前端部署 ---"

  local web_dist="$ROOT/apps/web/dist"
  local admin_dist="$ROOT/apps/admin/dist"

  if [ ! -d "$web_dist" ] || [ ! -d "$admin_dist" ]; then
    fail "前端构建产物不存在，请先执行构建"
    exit 1
  fi

  # 使用简单静态文件服务器
  # 生产环境建议用 nginx 等反向代理

  if command -v nginx &>/dev/null; then
    info "检测到 nginx，建议手动配置反向代理:"
    echo "    root $web_dist;"
    echo "    location /api { proxy_pass http://localhost:8000; }"
    echo "    location /admin { alias $admin_dist; try_files \$uri \$uri/index.html; }"
  else
    warn "未检测到 nginx，使用内置静态文件服务"
    info "C 端: http://localhost:3000"
    info "B 端: http://localhost:3001"

    cd "$ROOT"
    npx serve "$web_dist" -l 3000 --single &
    echo "  C 端 PID: $!"
    npx serve "$admin_dist" -l 3001 --single &
    echo "  B 端 PID: $!"
  fi

  ok "前端部署完成"
}

# ── 健康检查 ──────────────────────────────────────────────
health_check() {
  echo ""
  echo "--- 最终健康检查 ---"

  sleep 2
  if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    ok "后端 http://localhost:8000/health 正常"
  else
    fail "后端不可达"
  fi

  ok "部署完成"
  echo ""
  echo "  后端 API:  http://localhost:8000"
  echo "  C 端页面:  http://localhost:3000"
  echo "  B 端管理:  http://localhost:3001"
  echo "  API 文档:  http://localhost:8000/docs"
}

# ── 主流程 ──────────────────────────────────────────────
main() {
  preflight

  if [ "$SKIP_BUILD" = false ]; then
    build_all
  fi

  if [ "$SKIP_BACKEND" = false ]; then
    deploy_backend
  fi

  if [ "$SKIP_FRONTEND" = false ]; then
    deploy_frontend
  fi

  health_check
}

main