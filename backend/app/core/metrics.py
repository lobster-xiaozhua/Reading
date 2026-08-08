"""进程内请求指标（/metrics 端点数据源）。

计数器存储在应用进程内存中，由 AccessLogMiddleware 调用 ``inc_metric`` 写入，
``/metrics`` 端点读取。多 worker 部署时各自独立（可接受的近似值）。
"""

from collections import OrderedDict

_MAX_METRIC_PATHS = 500

request_counts: dict[str, int] = OrderedDict()  # path -> count
request_durations: dict[str, list[float]] = {}  # path -> [durations]
request_errors: dict[str, int] = {}  # path -> error count


def _trim_metric_paths() -> None:
    """按 LRU 淘汰：超过上限时移除最旧的 path，防止动态路径撑爆内存。"""
    while len(request_counts) > _MAX_METRIC_PATHS:
        oldest = request_counts.popitem(last=False)[0]
        request_durations.pop(oldest, None)
        request_errors.pop(oldest, None)


def inc_metric(path: str, duration_ms: float, status: int) -> None:
    """记录请求指标（非阻塞，线程安全使用 Python GIL）。"""
    key = path.split("?")[0]  # 去掉 query string
    request_counts.pop(key, None)
    request_counts[key] = request_counts.get(key, 0) + 1
    request_durations.setdefault(key, []).append(duration_ms)
    # 保留最近 200 条耗时记录
    if len(request_durations[key]) > 200:
        request_durations[key] = request_durations[key][-200:]
    if status >= 500:
        request_errors[key] = request_errors.get(key, 0) + 1
    _trim_metric_paths()
