#!/usr/bin/env sh
# ============================================================
# backend/docker-entrypoint.sh — 容器启动入口
#   1. 运行数据库迁移（生产模式依赖 alembic，DEBUG 时无副作用）
#   2. 按 DEBUG 决定启动命令（dev 单进程 / prod gunicorn 多 worker）
# ============================================================
set -e

echo "[entrypoint] 执行数据库迁移..."
alembic upgrade head

if [ "${DEBUG:-false}" = "true" ]; then
  echo "[entrypoint] DEBUG=true → 开发模式启动 uvicorn (reload)"
  exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
else
  echo "[entrypoint] 生产模式启动 gunicorn"
  exec gunicorn app.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --workers "${WEB_CONCURRENCY:-3}" \
    --preload \
    --reuse-port \
    --max-requests 1000 \
    --max-requests-jitter 200 \
    --timeout 60 \
    --graceful-timeout 30 \
    --access-logfile - \
    --error-logfile -
fi