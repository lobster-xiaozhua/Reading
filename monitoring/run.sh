#!/bin/bash
# 智能巡检运行脚本
# 用法: ./monitoring/run.sh [--only global|api|page|flow|health|perf] [--report json|html]

set -euo pipefail

MONITOR_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$MONITOR_DIR/.." && pwd)"
REPORT_DIR="$MONITOR_DIR/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_MODE="json"
ONLY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --report) REPORT_MODE="$2"; shift 2 ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

mkdir -p "$REPORT_DIR"

echo "========================================="
echo "  小说阅读平台 - 智能巡检"
echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 检查服务是否在线
check_service() {
  local name=$1 url=$2
  if curl -sf "$url" > /dev/null 2>&1; then
    echo "  [OK] $name 运行中"
    return 0
  else
    echo "  [FAIL] $name 未响应"
    return 1
  fi
}

echo ""
echo "--- 服务存活检查 ---"
check_service "后端 API" "http://localhost:8000/health" || true
check_service "B 端 Admin" "http://localhost:5174" || true
check_service "C 端 Web" "http://localhost:5173" || true

# 全局真实请求检查（覆盖 OpenAPI 全部端点，无需浏览器）
GLOBAL_OK=0
if [ "$ONLY" = "global" ] || [ "$ONLY" = "" ]; then
  echo ""
  echo "--- 全局真实请求检查 ---"
  GLOBAL_REPORT="$REPORT_DIR/global-$TIMESTAMP.json"
  set +e
  python3 "$PROJECT_ROOT/scripts/global-check/global_check.py" \
    --report "$GLOBAL_REPORT" 2>&1
  GLOBAL_OK=$?
  set -e
  if [ $GLOBAL_OK -ne 0 ]; then
    echo "  [WARN] 全局检查存在失败项（详见报告: $GLOBAL_REPORT）"
  else
    echo "  [OK] 全局检查全部通过"
  fi
fi

if [ "$ONLY" = "global" ]; then
  echo ""
  echo "========================================="
  echo "  全局检查报告: $GLOBAL_REPORT"
  echo "========================================="
  exit $GLOBAL_OK
fi

echo ""
echo "--- 执行 Playwright 巡检 ---"

PROJECT_FILTER=""
case "$ONLY" in
  health) PROJECT_FILTER="--project=backend" ;;
  api)    PROJECT_FILTER="--project=api-b-end --project=api-c-end --project=api-global" ;;
  page)   PROJECT_FILTER="--project=pages-b-end --project=pages-c-end" ;;
  flow)   PROJECT_FILTER="--project=business-flow" ;;
  perf)   PROJECT_FILTER="--project=performance" ;;
esac

cd "$PROJECT_ROOT"
set +e
npx playwright test --config="$MONITOR_DIR/playwright.config.ts" \
  $PROJECT_FILTER \
  --reporter="$REPORT_MODE" \
  --output="$REPORT_DIR/report-$TIMESTAMP" 2>&1 | tee "$REPORT_DIR/output-$TIMESTAMP.log"

EXIT_CODE=${PIPESTATUS[0]}
set -e

REPORT_FILE="$REPORT_DIR/report-$TIMESTAMP.json"
if [ -f "$MONITOR_DIR/results.json" ]; then
  mv "$MONITOR_DIR/results.json" "$REPORT_FILE"
fi

echo ""
echo "========================================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "  巡检结果: 全部通过"
else
  echo "  巡检结果: 存在失败项 (退出码: $EXIT_CODE)"
fi
echo "  报告: $REPORT_FILE"
echo "  日志: $REPORT_DIR/output-$TIMESTAMP.log"
echo "========================================="

if [ $EXIT_CODE -ne 0 ]; then
  exit $EXIT_CODE
fi
exit $GLOBAL_OK
