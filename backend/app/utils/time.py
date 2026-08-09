"""时间工具：统一毫秒时间戳口径，避免各服务重复定义。"""

import time
from datetime import date

_now_ms_cache = 0
_now_ms_epoch = 0


def now_ms() -> int:
    """返回当前毫秒时间戳（缓存 1 秒，降低高频调用开销）。"""
    global _now_ms_cache, _now_ms_epoch
    epoch = int(time.time())
    if epoch != _now_ms_epoch:
        _now_ms_epoch = epoch
        _now_ms_cache = epoch * 1000
    return _now_ms_cache


def ts_to_day(ts: int) -> str:
    """毫秒时间戳转 ISO 日期字符串，无效值返回空串。"""
    if not ts:
        return ""
    return date.fromtimestamp(ts / 1000).isoformat()
