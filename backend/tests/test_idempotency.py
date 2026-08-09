"""幂等键执行工具测试。"""

import pytest

from app.utils.idempotency import idempotent_run

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

    async def delete(self, key):
        self.data.pop(key, None)


class _BrokenRedis:
    async def set(self, *args, **kwargs):
        raise ConnectionError("down")

    async def delete(self, *args, **kwargs):
        raise ConnectionError("down")


class TestIdempotentRun:
    async def test_first_execution_returns_result(self):
        redis = _FakeRedis()
        calls = {"n": 0}

        async def fn():
            calls["n"] += 1
            return "ok-1"

        is_first, result = await idempotent_run(redis, "reward:1:abc", 60, fn)
        assert is_first is True
        assert result == "ok-1"
        assert calls["n"] == 1

    async def test_duplicate_key_skips_execution(self):
        redis = _FakeRedis()
        calls = {"n": 0}

        async def fn():
            calls["n"] += 1
            return "ok-1"

        first, _ = await idempotent_run(redis, "reward:1:dup", 60, fn)
        second, result = await idempotent_run(redis, "reward:1:dup", 60, fn)
        assert first is True
        assert second is False
        assert result is None
        assert calls["n"] == 1

    async def test_failure_releases_key_for_retry(self):
        redis = _FakeRedis()
        calls = {"n": 0}

        async def fn():
            calls["n"] += 1
            if calls["n"] == 1:
                raise RuntimeError("boom")
            return "ok"

        with pytest.raises(RuntimeError):
            await idempotent_run(redis, "reward:1:retry", 60, fn)
        is_first, result = await idempotent_run(redis, "reward:1:retry", 60, fn)
        assert is_first is True
        assert result == "ok"
        assert calls["n"] == 2

    async def test_without_key_executes_directly(self):
        calls = {"n": 0}

        async def fn():
            calls["n"] += 1
            return "ok"

        is_first, result = await idempotent_run(None, "", 60, fn)
        assert is_first is True
        assert result == "ok"
        assert calls["n"] == 1

    async def test_redis_failure_falls_back_to_direct_execution(self):
        calls = {"n": 0}

        async def fn():
            calls["n"] += 1
            return "ok"

        is_first, result = await idempotent_run(_BrokenRedis(), "reward:1:broken", 60, fn)
        assert is_first is True
        assert result == "ok"
        assert calls["n"] == 1
