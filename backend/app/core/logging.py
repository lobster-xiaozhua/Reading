"""统一日志配置：使用 structlog 提供结构化日志，支持 trace_id 链路追踪。

生产环境使用 QueueHandler 将日志发送到独立线程，避免 I/O 阻塞请求线程。
"""

import logging
import queue
import sys

import structlog

from app.core.config import settings

# 日志队列：QueueHandler 线程安全地将日志从 worker 线程转发到主线程 handler
_log_queue: queue.Queue = queue.Queue(-1)


def setup_logging() -> None:
    """初始化日志配置（应用启动时调用一次）。

    生产模式启用 QueueHandler 异步输出，开发模式直接使用同步 handler。
    """
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    is_prod = not settings.debug

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processor=structlog.dev.ConsoleRenderer(colors=False, sort_keys=False)
    )
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.setLevel(log_level)

    if is_prod:
        # 生产模式：QueueHandler 将日志异步转发到主线程 handler，避免阻塞 worker
        queue_handler = logging.QueueHandler(_log_queue)
        queue_handler.setLevel(log_level)
        queue_listener = logging.handlers.QueueListener(_log_queue, handler)
        queue_listener.start()
        # 将 QueueListener 附加到根 logger，应用退出时停止
        import atexit

        atexit.register(queue_listener.stop)
        root = logging.getLogger()
        root.addHandler(queue_handler)
    else:
        root = logging.getLogger()
        root.addHandler(handler)

    root.setLevel(log_level)

    # 控制第三方库日志级别
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
