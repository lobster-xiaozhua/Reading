#!/usr/bin/env bash
# ============================================================
# validate.sh — 本地预检脚本
# 在 push 前运行，模拟 CI 全流程，提前发现错误。
# 用法:
#   bash scripts/validate.sh          # 全量检查
#   bash scripts/validate.sh --quick  # 跳过构建和慢速测试
#   bash scripts/validate.sh --stage  backend|frontend|security
# ============================================================

set -o pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TIMING=""

# ── 颜色 ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── 辅助函数 ──────────────────────────────────────────────
header() {
  echo ""
  echo "================================================"
  echo "  $1"
  echo "================================================"
}

ok()   { echo -e "  ${GREEN}v${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}x${NC} $1"; ((FAIL++)); }
skip() { echo -e "  ${YELLOW}-${NC} $1 (skip)"; }
info() { echo -e "  ${CYAN}>${NC} $1"; }

run_step() {
  local name="$1" log="$2"
  shift 2
  echo "  [RUN] $name ..."
  local start=$(date +%s%N)
  if "$@" > "$log" 2>&1; then
    local elapsed=$(( ($(date +%s%N) - start) / 1000000 ))
    ok "$name (${elapsed}ms)"
    return 0
  else
    local elapsed=$(( ($(date +%s%N) - start) / 1000000 ))
    fail "$name (${elapsed}ms)"
    echo "    log: tail -50 $log"
    return 1
  fi
}

summary() {
  echo ""
  echo "================================================"
  echo "  结果汇总"
  echo "================================================"
  echo "  通过: $PASS  失败: $FAIL"
  if [ "$FAIL" -eq 0 ]; then
    echo "  OK - 全部通过，可以安全推送"
  else
    echo "  FAIL - 存在 $FAIL 个失败项，修复后重试"
    return 1
  fi
}

# ── 前置检查 ──────────────────────────────────────────────
preflight() {
  header "前置检查"

  # 检查依赖是否安装
  if [ ! -d "node_modules" ]; then
    fail "node_modules 不存在，请先运行 pnpm install"
    return 1
  fi
  ok "node_modules 存在"

  # 检查后端依赖是否安装
  if ! python3 -c "import fastapi" 2>/dev/null; then
    fail "后端依赖未安装，请运行 cd backend && pip install -e '.[dev]'"
    return 1
  fi
  ok "后端依赖已安装"

  # 检查 pip-audit 是否安装
  if command -v pip-audit &>/dev/null; then
    ok "pip-audit 已安装"
  else
    echo "  [WARN] pip-audit 未安装，安全审计将跳过 (pip install pip-audit)"
  fi

  # 检查 pnpm lockfile 是否最新
  if [ -f "pnpm-lock.yaml" ]; then
    ok "pnpm-lock.yaml 存在"
  else
    fail "pnpm-lock.yaml 缺失"
    return 1
  fi

  # 检查未提交的变更
  if [ -d ".git" ]; then
    local dirty=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$dirty" -gt 0 ]; then
      echo "  [WARN] 有 $dirty 个未提交的变更，建议先 commit 再验证"
    else
      ok "工作区干净"
    fi
  fi

  return 0
}

# ── 构建 ──────────────────────────────────────────────────
build_packages() {
  header "构建 Packages"

  run_step "tokens"  "/tmp/validate-build-tokens.log"    pnpm --filter @novel/tokens run build  || return 1
  run_step "icons"   "/tmp/validate-build-icons.log"     pnpm --filter @novel/icons run build   || return 1
  run_step "types"   "/tmp/validate-build-types.log"     pnpm --filter @novel/types run build   || return 1
  run_step "components" "/tmp/validate-build-components.log" pnpm --filter @novel/components run build || return 1
  run_step "b-end"   "/tmp/validate-build-bend.log"      pnpm --filter @novel/b-end run build   || return 1
  run_step "token-scanner" "/tmp/validate-build-scanner.log" pnpm --filter @novel/tools-token-scanner run build || return 1
}

build_apps() {
  header "构建前端应用"

  run_step "C 端 (apps/web)"    "/tmp/validate-build-web.log"    pnpm --filter @novel/web run build    || return 1
  run_step "B 端 (apps/admin)"  "/tmp/validate-build-admin.log"  pnpm --filter @novel/admin run build  || return 1
}

# ── 前端检查 ──────────────────────────────────────────────
frontend_checks() {
  header "前端检查"

  run_step "TypeScript 类型检查"  "/tmp/validate-typecheck.log"  pnpm run typecheck  || return 1
  run_step "B 端 ESLint"         "/tmp/validate-eslint.log"     pnpm --filter @novel/admin run lint  || return 1
  run_step "Token 安全扫描"       "/tmp/validate-token-scan.log" node tools/token-scanner/dist/cli.js --root .  || return 1
  run_step "Import 审计"          "/tmp/validate-import-audit.log" node tools/token-scanner/dist/import-audit.js --root apps/admin  || return 1
}

# ── 前端测试 ──────────────────────────────────────────────
frontend_tests() {
  header "前端测试"

  run_step "tokens 测试"      "/tmp/validate-test-tokens.log"    pnpm --filter @novel/tokens run test      || true
  run_step "icons 测试"       "/tmp/validate-test-icons.log"     pnpm --filter @novel/icons run test       || true
  run_step "components 测试"  "/tmp/validate-test-components.log" pnpm --filter @novel/components run test  || return 1
}

# ── 后端检查 ──────────────────────────────────────────────
backend_checks() {
  header "后端检查"

  run_step "Ruff 代码检查"  "/tmp/validate-ruff.log"  ruff check backend/app/ backend/tests/  || return 1
  run_step "模块导入检查"    "/tmp/validate-import.log" python3 -c "import sys; sys.path.insert(0, 'backend'); import app.main"  || return 1
  run_step "后端健康检查"    "/tmp/validate-health.log"  python3 -c "
import sys; sys.path.insert(0, 'backend')
from app.main import app
from httpx import ASGITransport, AsyncClient
import asyncio
async def check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as c:
        r = await c.get('/health')
        d = r.json()
        assert d.get('status') == 'ok', f'unexpected: {d}'
        print('Backend health check passed')
asyncio.run(check())
"  || return 1
}

backend_tests() {
  header "后端测试 (覆盖率门禁 70%)"

  run_step "Pytest (306 个)" "/tmp/validate-pytest.log" \
    python3 -m pytest backend/tests/ -v --tb=short \
    --cov=backend/app/ --cov-report=term-missing --cov-fail-under=70  || return 1
}

# ── 安全审计 ──────────────────────────────────────────────
security_audit() {
  header "安全审计"

  run_step "pnpm audit"  "/tmp/validate-pnpm-audit.log"  pnpm audit --audit-level=high  || true
  run_step "pip audit"   "/tmp/validate-pip-audit.log"   pip-audit --project backend  || true
}

# ── 快速检查（跳过构建和慢速测试） ──────────────────────────
quick_checks() {
  header "快速检查模式"

  # 类型检查
  if [ -d "packages/tokens/dist" ] && [ -d "packages/types/dist" ]; then
    run_step "TypeScript 类型检查" "/tmp/validate-quick-typecheck.log" pnpm run typecheck || return 1
  else
    skip "TypeScript 类型检查 (需先构建)"
  fi

  # Ruff
  run_step "Ruff 代码检查" "/tmp/validate-quick-ruff.log" ruff check backend/app/ backend/tests/ || return 1

  # Token 扫描
  if [ -f "tools/token-scanner/dist/cli.js" ]; then
    run_step "Token 安全扫描" "/tmp/validate-quick-token.log" node tools/token-scanner/dist/cli.js --root . || return 1
  else
    skip "Token 安全扫描 (需先构建 token-scanner)"
  fi

  # Import 审计
  if [ -f "tools/token-scanner/dist/import-audit.js" ]; then
    run_step "Import 审计" "/tmp/validate-quick-audit.log" node tools/token-scanner/dist/import-audit.js --root apps/admin || return 1
  else
    skip "Import 审计 (需先构建 token-scanner)"
  fi

  # ESLint（仅 admin 有真实 lint）
  run_step "B 端 ESLint" "/tmp/validate-quick-eslint.log" pnpm --filter @novel/admin run lint || return 1
}

# ── 主流程 ──────────────────────────────────────────────
main() {
  local mode="${1:-full}"

  echo "+-------------------------------------------------------+"
  echo "|  Atlas Novel Reader - 本地预检脚本                     |"
  echo "|  模拟 CI 全流程，提前发现错误                          |"
  echo "+-------------------------------------------------------+"
  echo "  模式: $mode"
  echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
  echo -e "  PID:  $$"

  case "$mode" in
    --quick)
      preflight
      quick_checks
      ;;
    --stage)
      stage="$2"
      case "$stage" in
        backend)
          backend_checks
          backend_tests
          ;;
        frontend)
          build_packages
          build_apps
          frontend_checks
          frontend_tests
          ;;
        security)
          security_audit
          ;;
        *)
          echo "未知阶段: $stage"
          echo "可用: backend, frontend, security"
          exit 1
          ;;
      esac
      ;;
    full|--full)
      preflight
      build_packages
      build_apps
      frontend_checks
      frontend_tests
      backend_checks
      backend_tests
      security_audit
      ;;
    *)
      echo "未知参数: $mode"
      echo "用法: bash scripts/validate.sh [--quick|--stage backend|frontend|security|full]"
      exit 1
      ;;
  esac

  echo
  summary
}

main "$@"