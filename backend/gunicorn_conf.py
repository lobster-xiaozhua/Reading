"""Gunicorn 生产配置。

workers = cpu_cores * 2 + 1，keep-alive 65s 以复用 TCP 连接。
通过环境变量 GUNICORN_WORKERS 覆盖，方便容器场景按资源限制调整。
"""

import multiprocessing
import os

# 可通过环境变量 GUNICORN_WORKERS 覆盖
_workers = os.getenv("GUNICORN_WORKERS")
workers = int(_workers) if _workers else multiprocessing.cpu_count() * 2 + 1

bind = "0.0.0.0:8000"
backlog = 2048
timeout = 120
keepalive = 65
worker_class = "uvicorn.workers.UvicornWorker"
accesslog = "-"
errorlog = "-"
loglevel = "info"
preload_app = True


def post_fork(server, worker):
    """fork 后重置全局 Redis 客户端，避免子进程继承父进程连接。"""
    from app.core.redis import reset_redis

    reset_redis()
