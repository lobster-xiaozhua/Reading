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
timeout = 60        # worker 处理超时（减少长尾请求占用）
keepalive = 65      # HTTP keep-alive 连接保持时间
worker_class = "uvicorn.workers.UvicornWorker"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")
preload_app = True  # 先加载应用再 fork，利用写时复制减少内存占用

# 每 worker 处理 N 个请求后重启，释放内存碎片
max_requests = 2000
max_requests_jitter = 300


def post_fork(server, worker):
    """fork 后重置全局 Redis 客户端，避免子进程继承父进程连接。"""
    from app.core.redis import reset_redis

    reset_redis()
