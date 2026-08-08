#!/usr/bin/env bash
# ============================================================
# validate.sh — 本地预检脚本
# 在 push 前运行，模拟 CI 全流程，提前发现错误。
# 用法:
#   bash scripts/validate.sh          # 全量检查
#   bash scripts/validate.sh --quick  # 跳过构建和慢速测试
#   bash scripts/validate.sh --stage  backend|frontend|security
#   bash scripts/validate.sh --parallel  # 并行执行（CI 模式）
# ============================================================

set -o pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
TIMING_START=$(date +%s)
PARALLEL_MODE=false
SKIP_SLOW=false

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
  local total_time=$(( $(date +%s) - TIMING_START ))
  echo ""
  echo "================================================"
  echo "  结果汇总"
  echo "================================================"
  echo "  通过: $PASS  失败: $FAIL"
  echo "  总耗时: ${total_time}s"
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

# ── 构建（带缓存检查）─────────────────────────────────
build_packages() {
  header "构建 Packages"
  
  local need_build=false
  for pkg in tokens icons types components b-end; do
    if [ ! -d "packages/$pkg/dist" ]; then
      need_build=true
      break
    fi
  done
  
  if [ "$need_build" = false ]; then
    skip "Packages 构建缓存有效，跳过"
    return 0
  fi
  
  run_step "tokens"  "/tmp/validate-build-tokens.log"  pnpm --filter @novel/tokens run build
  run_step "icons"   "/tmp/validate-build-icons.log"   pnpm --filter @novel/icons run build
  run_step "types"   "/tmp/validate-build-types.log"   pnpm --filter @novel/types run build
  run_step "components" "/tmp/validate-build-components.log" pnpm --filter @novel/components run build
  run_step "b-end"   "/tmp/validate-build-bend.log"    pnpm --filter @novel/b-end run build
  run_step "token-scanner" "/tmp/validate-build-scanner.log" pnpm --filter @novel/tools-token-scanner run build
}

build_apps() {
  header "构建前端应用"

  if [ ! -d "apps/web/dist" ] || [ ! -d "apps/admin/dist" ]; then
    run_step "C 端 (apps/web)"    "/tmp/validate-build-web.log"    pnpm --filter @novel/web run build
    run_step "B 端 (apps/admin)"  "/tmp/validate-build-admin.log"  pnpm --filter @novel/admin run build
  else
    skip "前端构建缓存有效，跳过"
  fi
}

# ── 前端检查 ──────────────────────────────────────────────
frontend_checks() {
  header "前端检查"

  run_step "TypeScript 类型检查"  "/tmp/validate-typecheck.log"  pnpm run typecheck
  run_step "B 端 ESLint"         "/tmp/validate-eslint.log"     pnpm --filter @novel/admin run lint
  run_step "Token 安全扫描"       "/tmp/validate-token-scan.log" node tools/token-scanner/dist/cli.js --root .
  run_step "Import 审计"          "/tmp/validate-import-audit.log" node tools/token-scanner/dist/import-audit.js --root apps/admin
}

# ── 前端测试（并行）─────────────────────────────────────
frontend_tests() {
  header "前端测试"
  
  # 跳过无测试的包，只运行有实际测试的包
  local web_test=false
  local admin_test=false
  local components_test=false
  
  [ -d "apps/web/src/__tests__" ] && web_test=true
  [ -d "apps/admin/src/__tests__" ] && admin_test=true
  [ -d "packages/components/src/__tests__" ] && components_test=true
  
  if [ "$web_test" = true ]; then
    run_step "C 端测试" "/tmp/validate-test-web.log" pnpm --filter @novel/web exec vitest run
  else
    skip "C 端无测试文件"
  fi
  
  if [ "$admin_test" = true ]; then
    run_step "B 端测试" "/tmp/validate-test-admin.log" pnpm --filter @novel/admin exec vitest run
  else
    skip "B 端无测试文件"
  fi
  
  if [ "$components_test" = true ]; then
    run_step "Components 测试" "/tmp/validate-test-components.log" pnpm --filter @novel/components run test
  else
    skip "Components 无测试文件"
  fi
}

# ── 后端检查 ──────────────────────────────────────────────
backend_checks() {
  header "后端检查"

  # 从 backend/.env 加载 JWT_SECRET（若存在），避免生产模式校验失败
  if [ -f "backend/.env" ]; then
    export JWT_SECRET=$(grep '^JWT_SECRET=' backend/.env | head -1 | cut -d= -f2-)
  fi

  run_step "Ruff 代码检查"  "/tmp/validate-ruff.log"  ruff check backend/app/ backend/tests/
  run_step "模块导入检查"    "/tmp/validate-import.log" python3 -c "import sys; sys.path.insert(0, 'backend'); import app.main"
  run_step "后端健康检查"    "/tmp/validate-health.log" python3 -c "
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
"
}

backend_tests() {
  header "后端测试 (并行执行，跳过覆盖率)"

  local extra_opts=""
  if [ "$SKIP_SLOW" = true ]; then
    extra_opts="-m 'not slow'"
    info "跳过慢速测试（hypothesis/benchmark）"
  fi

  run_step "Pytest (475 个，-n auto)" "/tmp/validate-pytest.log" \
    python3 -m pytest backend/tests/ -q --tb=short $extra_opts
}

# ── 全局真实请求检查 ─────────────────────────────────────
global_check() {
  header "全局真实请求检查（端到端冒烟）"

  local backend_up=false
  curl -sf http://localhost:8000/health >/dev/null 2>&1 && backend_up=true

  if [ "$backend_up" = false ]; then
    skip "后端未运行，跳过全局检查（先启动后端: bash start.sh 或 cd backend && uvicorn app.main:app）"
    return 0
  fi

  run_step "全端点真实请求检查 (api + pages)" "/tmp/validate-global.log" \
    python3 scripts/global-check/global_check.py --report /tmp/validate-global-report.json || true
}

# ── 安全审计 ──────────────────────────────────────────────
security_audit() {
  header "安全审计"

  run_step "pnpm audit"  "/tmp/validate-pnpm-audit.log"  pnpm audit --audit-level=high || true
  run_step "pip audit"   "/tmp/validate-pip-audit.log"   pip-audit /workspace/backend || true
}

# ── 快速检查（跳过构建和慢速测试）─────────────────────────
quick_checks() {
  header "快速检查模式"

  # 类型检查
  if [ -d "packages/tokens/dist" ] && [ -d "packages/types/dist" ]; then
    run_step "TypeScript 类型检查" "/tmp/validate-quick-typecheck.log" pnpm run typecheck
  else
    skip "TypeScript 类型检查 (需先构建)"
  fi

  # Ruff
  run_step "Ruff 代码检查" "/tmp/validate-quick-ruff.log" ruff check backend/app/ backend/tests/

  # Token 扫描
  if [ -f "tools/token-scanner/dist/cli.js" ]; then
    run_step "Token 安全扫描" "/tmp/validate-quick-token.log" node tools/token-scanner/dist/cli.js --root .
  else
    skip "Token 安全扫描 (需先构建 token-scanner)"
  fi

  # Import 审计
  if [ -f "tools/token-scanner/dist/import-audit.js" ]; then
    run_step "Import 审计" "/tmp/validate-quick-audit.log" node tools/token-scanner/dist/import-audit.js --root apps/admin
  else
    skip "Import 审计 (需先构建 token-scanner)"
  fi

  # ESLint（仅 admin 有真实 lint）
  run_step "B 端 ESLint" "/tmp/validate-quick-eslint.log" pnpm --filter @novel/admin run lint
}

# ── CI 并行模式───────────────────────────────────────────
ci_parallel_mode() {
  header "CI 并行模式"
  
  info "启动并行检查..."
  
  # 并行运行各检查项
  (run_step "TypeScript 类型检查" "/tmp/ci-typecheck.log" pnpm run typecheck) &
  local pid1=$!
  (run_step "Ruff 代码检查" "/tmp/ci-ruff.log" ruff check backend/app/ backend/tests/) &
  local pid2=$!
  (run_step "后端测试" "/tmp/ci-pytest.log" cd backend && python3 -m pytest tests/ -q --tb=short --no-cov) &
  local pid3=$!
  (run_step "C 端测试" "/tmp/ci-web-test.log" pnpm --filter @novel/web exec vitest run --no-coverage) &
  local pid4=$!
  (run_step "B 端测试" "/tmp/ci-admin-test.log" pnpm --filter @novel/admin exec vitest run --no-coverage) &
  local pid5=$!
  
  wait $pid1
  wait $pid2
  wait $pid3
  wait $pid4
  wait $pid5
  
  ok "CI 并行检查完成"
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
      SKIP_SLOW=true
      preflight
      quick_checks
      ;;
    --fast)
      SKIP_SLOW=true
      preflight
      quick_checks
      ;;
    --parallel)
      preflight
      ci_parallel_mode
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
        global)
          global_check
          ;;
        *)
          echo "未知阶段: $stage"
          echo "可用: backend, frontend, security, global"
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
      global_check
      security_audit
      ;;
    *)
      echo "未知参数: $mode"
      echo "用法: bash scripts/validate.sh [--quick|--parallel|--stage backend|frontend|security|full]"
      exit 1
      ;;
  esac

  echo
  summary
}

main "$@"
