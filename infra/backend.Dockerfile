# 后端镜像：FastAPI + Gunicorn/Uvicorn（生产）
# 构建上下文为仓库根目录：docker build -f infra/backend.Dockerfile .
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY backend/pyproject.toml ./
RUN pip install --no-cache-dir "." gunicorn uvicorn[standard]

COPY backend/app ./app
COPY backend/scripts ./scripts
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./

EXPOSE 8000

# 启动前执行迁移，再以 Gunicorn 多 worker 承载
CMD sh -c "alembic upgrade head && gunicorn app.main:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 -w 4 --access-logfile -"
