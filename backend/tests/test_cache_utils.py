"""Redis 缓存工具测试（dict/list/pydantic 序列化、失败降级）。"""

from app.utils.cache import cache_set


class _FakeRedis:
    def __init__(self):
        self.data = {}

    async def set(self, key, value, ex=None):
        self.data[key] = value


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
