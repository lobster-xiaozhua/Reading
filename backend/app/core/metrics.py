"""进程内请求指标（/metrics 端点数据源）。

使用 list-of-lists 替代 dict 存储耗时数据，减少内存分配与 dict 并发写入开销。
GIL 保证单进程内原子操作安全；多 worker 各自独立统计。
"""

from collections import OrderedDict

_MAX_METRIC_PATHS = 500
_MAX_DURATIONS_PER_PATH = 200
_MAX_SLOW_DETAILS = 50


class _PathMetrics:
    """单路径指标容器，__slots__ 减少内存占用与属性查找开销。"""
    __slots__ = ("count", "durations", "errors")

    def __init__(self) -> None:
        self.count: int = 0
        self.durations: list[float] = []
        self.errors: int = 0


class _MetricStore:
    """线程安全指标存储（单 worker 内 GIL 保证）。"""

    __slots__ = (
        "_cache_patterns",
        "_paths",
        "_redis_cmd_totals",
        "_redis_hits",
        "_redis_misses",
        "_slow_queries",
        "_slow_query_details",
        "_slow_redis_cmds",
    )

    def __init__(self) -> None:
        self._paths: OrderedDict[str, _PathMetrics] = OrderedDict()
        self._redis_hits: int = 0
        self._redis_misses: int = 0
        self._redis_cmd_totals: dict[str, int] = {}
        self._slow_queries: list[float] = []
        self._slow_query_details: list[tuple[str, float]] = []
        self._slow_redis_cmds: list[tuple[str, float]] = []
        self._cache_patterns: OrderedDict[str, list[int]] = OrderedDict()

    def inc(self, path: str, duration_ms: float, status: int) -> None:
        """记录一次请求。"""
        key = path.split("?")[0]
        m = self._paths.get(key)
        if m is None:
            m = _PathMetrics()
            self._paths[key] = m
            if len(self._paths) > _MAX_METRIC_PATHS:
                self._paths.popitem(last=False)
        m.count += 1
        d = m.durations
        d.append(duration_ms)
        if len(d) > _MAX_DURATIONS_PER_PATH:
            m.durations = d = d[-_MAX_DURATIONS_PER_PATH:]
        if status >= 500:
            m.errors += 1

    def snapshot(self) -> tuple[dict, dict, dict]:
        """返回当前快照供 /metrics 端点消费。"""
        counts: dict[str, int] = {}
        durations: dict[str, list[float]] = {}
        errors: dict[str, int] = {}
        for path, m in self._paths.items():
            counts[path] = m.count
            durations[path] = m.durations
            if m.errors > 0:
                errors[path] = m.errors
        return counts, durations, errors

    def inc_redis(self, hit: bool) -> None:
        """记录一次 Redis 缓存读取（命中/未命中）。"""
        if hit:
            self._redis_hits += 1
        else:
            self._redis_misses += 1

    def inc_cache_access(self, pattern: str, hit: bool) -> None:
        """记录某缓存模式的一次访问（热 key 分析：命中/未命中）。"""
        m = self._cache_patterns.get(pattern)
        if m is None:
            m = [0, 0]
            self._cache_patterns[pattern] = m
            if len(self._cache_patterns) > 200:
                self._cache_patterns.popitem(last=False)
        m[0 if hit else 1] += 1

    def cache_pattern_stats(self) -> dict[str, tuple[int, int]]:
        """返回缓存模式访问统计：{pattern: (hits, misses)}。"""
        return {p: (m[0], m[1]) for p, m in self._cache_patterns.items()}

    def record_slow_query(self, duration_ms: float, statement: str = "") -> None:
        """记录一次慢查询耗时与归一化语句（保留最慢 Top 50）。"""
        self._slow_queries.append(duration_ms)
        if len(self._slow_queries) > 500:
            self._slow_queries = self._slow_queries[-500:]
        if statement:
            self._slow_query_details.append((statement, duration_ms))
            self._slow_query_details = sorted(
                self._slow_query_details, key=lambda kv: kv[1], reverse=True
            )[:_MAX_SLOW_DETAILS]

    def redis_stats(self) -> dict:
        """返回 Redis 缓存命中统计。"""
        return {"hits": self._redis_hits, "misses": self._redis_misses}

    def slow_query_stats(self) -> tuple[int, float | None]:
        """返回慢查询统计：(总次数, 最近平均耗时 ms)。"""
        if not self._slow_queries:
            return 0, None
        return len(self._slow_queries), sum(self._slow_queries) / len(self._slow_queries)

    def slow_query_details(self) -> list[tuple[str, float]]:
        """返回最慢 SQL 明细：(归一化语句, 耗时 ms)。"""
        return list(self._slow_query_details)

    def record_redis_call(self, command: str) -> None:
        """记录一次 Redis 命令执行（命令级调用计数）。"""
        self._redis_cmd_totals[command] = self._redis_cmd_totals.get(command, 0) + 1

    def record_slow_redis(self, command: str, duration_ms: float) -> None:
        """记录一次慢 Redis 命令（保留最慢 Top 50）。"""
        self._slow_redis_cmds.append((command, duration_ms))
        self._slow_redis_cmds = sorted(
            self._slow_redis_cmds, key=lambda kv: kv[1], reverse=True
        )[:_MAX_SLOW_DETAILS]

    def redis_command_stats(self) -> tuple[dict[str, int], list[tuple[str, float]]]:
        """返回 Redis 命令统计：(调用次数, 慢命令明细)。"""
        return dict(self._redis_cmd_totals), list(self._slow_redis_cmds)


# 全局指标存储（单例）
_store = _MetricStore()


def inc_metric(path: str, duration_ms: float, status: int) -> None:
    _store.inc(path, duration_ms, status)


def inc_redis(hit: bool) -> None:
    _store.inc_redis(hit)


def inc_cache_access(pattern: str, hit: bool) -> None:
    _store.inc_cache_access(pattern, hit)


def record_slow_query(duration_ms: float, statement: str = "") -> None:
    _store.record_slow_query(duration_ms, statement)


def get_metrics() -> tuple[dict, dict, dict]:
    return _store.snapshot()


def get_redis_stats() -> dict:
    return _store.redis_stats()


def get_slow_query_stats() -> tuple[int, float | None]:
    return _store.slow_query_stats()


def get_slow_query_details() -> list[tuple[str, float]]:
    return _store.slow_query_details()


def get_cache_pattern_stats() -> dict[str, tuple[int, int]]:
    return _store.cache_pattern_stats()


def record_redis_call(command: str) -> None:
    _store.record_redis_call(command)


def record_slow_redis(command: str, duration_ms: float) -> None:
    _store.record_slow_redis(command, duration_ms)


def get_redis_command_stats() -> tuple[dict[str, int], list[tuple[str, float]]]:
    return _store.redis_command_stats()
