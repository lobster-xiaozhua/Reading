# ============================================================
# 后端 Dockerfile — FastAPI (gunicorn + uvicorn worker)
# 构建:  docker build -f backend/Dockerfile -t novel-backend backend/
# ============================================================

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 系统依赖（alembic / aiosqlite 等纯 Python，无编译需求）
COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic
COPY scripts ./scripts
COPY docker-entrypoint.sh ./

# 安装依赖（含 gunicorn / uvicorn[standard]）
RUN pip install --upgrade pip && pip install -e ".[dev]"

# 健康检查
EXPOSE 8000

# 非 root 运行（创建普通用户 + 可写数据/上传目录）
RUN useradd -m -u 1001 appuser \
    && mkdir -p /data /app/uploads \
    && chown -R appuser:appuser /app /data \
    && chmod +x /app/docker-entrypoint.sh
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

ENTRYPOINT ["/app/docker-entrypoint.sh"]