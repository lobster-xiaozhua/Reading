#!/bin/bash
# 启动前后端服务
# 后端: 8000, 前端(Admin): 5174, 前端(Web): 5173

cd /workspace/backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd /workspace/apps/admin && pnpm dev &
ADMIN_PID=$!

cd /workspace/apps/web && pnpm dev &
WEB_PID=$!

trap "kill $BACKEND_PID $ADMIN_PID $WEB_PID 2>/dev/null" EXIT
wait $ADMIN_PID
