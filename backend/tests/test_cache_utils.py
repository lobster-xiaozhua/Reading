"""Redis 缓存工具测试（dict/list/pydantic 序列化、失败降级、单飞锁）。"""

import pytest

from app.utils.cache import cache_get, cache_set, cache_single_flight

pytestmark = pytest.mark.unit


class _FakeRedis:
    def __init__(self):
        self.data = {}

    async def set(self, key, value, ex=None, nx=False):
        if nx:
            if key in self.data:
                return False
            self.data[key] = value
            return True
        self.data[key] = value
        return True

    async def get(self, key):
        return self.data.get(key)

    async def delete(self, key):
        self.data.pop(key, None)

    async def exists(self, key):
        return 1 if key in self.data else 0


class _BrokenRedis:
    async def set(self, *args, **kwargs):
        raise ConnectionError("redis down")


class _FakeModel:
    def model_dump_json(self, **kwargs):
        return '{"a": 1}'


async def test_cache_set_dict_serialized():
    redis = _FakeRedis()
    await cache_set(redis, "key:dict", {"a": 1}, 60)
    assert redis.data["key:dict"] == '{"a":1}'


async def test_cache_set_list_serialized():
    redis = _FakeRedis()
    await cache_set(redis, "key:list", [1, "x"], 60)
    assert redis.data["key:list"] == '[1,"x"]'


async def test_cache_set_model_uses_model_dump_json():
    redis = _FakeRedis()
    await cache_set(redis, "key:model", _FakeModel(), 60)
    assert redis.data["key:model"] == '{"a": 1}'


async def test_cache_set_failure_swallowed():
    await cache_set(_BrokenRedis(), "key:broken", {"a": 1}, 60)


class TestSingleFlight:
    async def test_loader_executes_and_lock_released(self):
        redis = _FakeRedis()
        calls = {"n": 0}

        async def loader():
            calls["n"] += 1
            return {"ok": 1}

        result = await cache_single_flight(redis, "lock:1", loader)
        assert result == {"ok": 1}
        assert calls["n"] == 1
        assert await redis.exists("lock:1") == 0

    async def test_second_caller_waits_for_lock_then_executes(self):
        redis = _FakeRedis()
        calls = {"n": 0}
        # 模拟锁被占：先执行一次（会加锁再释放），第二次调用无锁占用
        async def loader():
            calls["n"] += 1
            return {"ok": calls["n"]}

        r1 = await cache_single_flight(redis, "lock:2", loader)
        r2 = await cache_single_flight(redis, "lock:2", loader)
        assert r1 == {"ok": 1}
        assert r2 == {"ok": 2}
        assert calls["n"] == 2

    async def test_lock_released_on_loader_error(self):
        redis = _FakeRedis()

        async def bad_loader():
            raise RuntimeError("boom")

        with pytest.raises(RuntimeError):
            await cache_single_flight(redis, "lock:3", bad_loader)
        assert await redis.exists("lock:3") == 0


class TestCacheGetObservability:
    async def test_cache_get_counts_hit_and_miss(self):
        from app.core import metrics as m

        redis = _FakeRedis()
        await redis.set("k:hit", "v")
        assert await cache_get(redis, "k:hit") == "v"
        assert await cache_get(redis, "k:miss") is None
        stats = m.get_redis_stats()
        assert stats["hits"] >= 1
        assert stats["misses"] >= 1

    async def test_cache_get_connection_error_counts_miss(self):
        from app.core import metrics as m

        class _BrokenGetRedis:
            async def get(self, key):
                raise ConnectionError("down")

        assert await cache_get(_BrokenGetRedis(), "k:any") is None
        stats = m.get_redis_stats()
        assert stats["misses"] >= 1

    def test_slow_query_recorded(self):
        from app.core import metrics as m

        before, _ = m.get_slow_query_stats()
        m.record_slow_query(123.4)
        count, avg = m.get_slow_query_stats()
        assert count == before + 1
        assert avg is not None and avg > 0

    def test_slow_query_details_keeps_top(self):
        from app.core import metrics as m

        m.record_slow_query(200.0, "SELECT a FROM t WHERE id=?")
        m.record_slow_query(900.0, "SELECT b FROM u WHERE id=?")
        m.record_slow_query(50.0, "SELECT c FROM v")
        details = m.get_slow_query_details()
        assert details[0][0] == "SELECT b FROM u WHERE id=?"
        assert details[0][1] == 900.0
        assert len(details) >= 3

    def test_slow_query_sql_normalization(self):
        from app.core.database import _normalize_sql

        raw = "SELECT * FROM novels WHERE id = 123 AND title = '测试'"
        norm = _normalize_sql(raw)
        assert "123" not in norm
        assert "'测试'" not in norm
        assert norm.startswith("SELECT * FROM novels WHERE id = ? AND title = ?")


class TestRedisCommandTiming:
    def test_redis_command_calls_recorded(self):
        from app.core import metrics as m

        before = m.get_redis_command_stats()[0].get("get", 0)
        m.record_redis_call("get")
        after = m.get_redis_command_stats()[0].get("get", 0)
        assert after == before + 1

    def test_slow_redis_command_recorded(self):
        from app.core import metrics as m

        m.record_slow_redis("hgetall", 35.0)
        _totals, slow = m.get_redis_command_stats()
        assert ("hgetall", 35.0) in slow

    async def test_timed_redis_wrapper_records_calls(self):
        from app.core import metrics as m
        from app.core.redis import _TimedRedis

        fake = _FakeRedis()
        timed = _TimedRedis(fake)
        await timed.set("k", "v")
        await timed.get("k")
        totals = m.get_redis_command_stats()[0]
        assert totals.get("set", 0) >= 1
        assert totals.get("get", 0) >= 1

    async def test_cache_get_tracks_pattern_for_hot_key(self):
        from app.core import metrics as m

        redis = _FakeRedis()
        await redis.set("c:book:100", "v1")
        await redis.set("c:book:200", "v2")
        before_hits, before_misses = m.get_cache_pattern_stats().get("c:book:{id}", (0, 0))
        # 命中两个不同数字 ID，归一化到同一模式 c:book:{id}
        await cache_get(redis, "c:book:100")
        await cache_get(redis, "c:book:200")
        await cache_get(redis, "c:book:999")  # 未命中
        hits, misses = m.get_cache_pattern_stats().get("c:book:{id}", (0, 0))
        assert hits - before_hits == 2
        assert misses - before_misses == 1

    def test_cache_pattern_normalizes_digits(self):
        from app.utils.cache import _cache_pattern

        assert _cache_pattern("c:book:123") == "c:book:{id}"
        assert _cache_pattern("c:chapter:1:2") == "c:chapter:{id}:{id}"
        assert _cache_pattern("c:me:heatmap:42") == "c:me:heatmap:{id}"
