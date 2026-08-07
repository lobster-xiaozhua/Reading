"""发现页服务缓存行为验证（阶段 3-2）。

验证 Cache-Aside 策略：
  - 未命中回源并回填
  - 命中时不产生 DB 查询
  - TTL 分层符合预期（各模块 key 的过期时间）
  - 聚合 HOME 缓存整体命中时不查库
"""

from app.core.redis import CacheKeys
from app.models.novel import Novel
from app.services.discovery_service import DiscoveryService


async def _add_published_novel(db_session, title="缓存热书", **kw):
    defaults = {
        "category": "xuanhuan",
        "status": "published",
        "word_count": 100,
        "click_count": 100,
        "flags": "hot",
    }
    defaults.update(kw)
    db_session.add(Novel(title=title, **defaults))
    await db_session.commit()


class TestDiscoveryCache:
    async def _make_svc(self, db_session, redis_client):
        return DiscoveryService(db_session, redis_client)

    async def test_miss_backfills_cache(self, db_session, redis_client):
        await _add_published_novel(db_session, title="回填书")
        svc = await self._make_svc(db_session, redis_client)

        result = await svc.get_hot_books(6)

        assert len(result) == 1
        assert result[0].title == "回填书"
        # 未命中后已回填
        assert await redis_client.exists(CacheKeys.HOT_BOOKS)
        ttl = await redis_client.ttl(CacheKeys.HOT_BOOKS)
        assert 0 < ttl <= 300

    async def test_hit_skips_db_query(self, db_session, redis_client, db_query_counter):
        counts, reset = db_query_counter
        await _add_published_novel(db_session)
        svc = await self._make_svc(db_session, redis_client)

        first = await svc.get_hot_books(6)
        assert len(first) == 1

        reset()
        second = await svc.get_hot_books(6)

        assert [b.title for b in second] == [b.title for b in first]
        # 命中缓存：零 DB 查询
        assert counts[0] == 0

    async def test_ttl_layers(self, db_session, redis_client):
        await _add_published_novel(db_session)
        svc = await self._make_svc(db_session, redis_client)

        await svc.get_banners()
        await svc.get_ranking("hot")
        await svc.get_categories()
        await svc.get_tags()

        assert 0 < await redis_client.ttl(CacheKeys.BANNERS) <= 300
        assert 0 < await redis_client.ttl(CacheKeys.rank("hot")) <= 600
        assert 0 < await redis_client.ttl(CacheKeys.CATEGORIES) <= 86401
        assert 0 < await redis_client.ttl(CacheKeys.TAGS) <= 86401

    async def test_home_aggregate_hit_skips_db(self, db_session, redis_client, db_query_counter):
        counts, reset = db_query_counter
        await _add_published_novel(db_session, title="聚合书")
        svc = await self._make_svc(db_session, redis_client)

        first = await svc.get_home_payload()
        assert len(first.hot_books) == 1

        reset()
        second = await svc.get_home_payload()

        assert [b.title for b in second.hot_books] == [b.title for b in first.hot_books]
        # HOME 聚合缓存整体命中：零 DB 查询
        assert counts[0] == 0


class TestDiscoveryCacheHit:
    async def test_banners_cache_hit(self, db_session, redis_client):
        svc = DiscoveryService(db_session, redis_client)
        await svc.get_banners()
        result = await svc.get_banners()
        assert result == []

    async def test_editor_picks_cache_hit(self, db_session, redis_client):
        await _add_published_novel(db_session, flags="editor-pick")
        svc = DiscoveryService(db_session, redis_client)
        first = await svc.get_editor_picks(6)
        assert len(first) == 1
        second = await svc.get_editor_picks(6)
        assert second[0].book.title == first[0].book.title

    async def test_ranking_cache_hit(self, db_session, redis_client):
        await _add_published_novel(db_session)
        svc = DiscoveryService(db_session, redis_client)
        first = await svc.get_ranking("hot")
        assert len(first) == 1
        second = await svc.get_ranking("hot")
        assert second[0].rank == 1

    async def test_categories_cache_hit(self, db_session, redis_client):
        svc = DiscoveryService(db_session, redis_client)
        await svc.get_categories()
        result = await svc.get_categories()
        assert result == []

    async def test_tags_cache_hit(self, db_session, redis_client):
        svc = DiscoveryService(db_session, redis_client)
        await svc.get_tags()
        result = await svc.get_tags()
        assert result == []


class TestDiscoveryFallback:
    async def test_home_invalid_cache_rebuilds(self, db_session, redis_client):
        await redis_client.set(CacheKeys.HOME, "{broken json")
        svc = DiscoveryService(db_session, redis_client)
        payload = await svc.get_home_payload()
        assert payload.hot_books == []

    async def test_module_failure_degrades_to_empty(self, db_session):
        class _FlakyRedis:
            async def get(self, key, *args, **kwargs):
                if key == CacheKeys.HOME:
                    return None
                raise ConnectionError("redis down")

            async def set(self, *args, **kwargs):
                raise ConnectionError("redis down")

        svc = DiscoveryService(db_session, _FlakyRedis())
        payload = await svc.get_home_payload()
        assert payload.banners == []
        assert payload.hot_books == []
        assert payload.rankings == {"hot": [], "follow": [], "ticket": [], "new": []}

    async def test_editor_picks_cache_invalid_returns_empty(self, db_session, redis_client):
        await redis_client.set(CacheKeys.EDITOR_PICKS, "[]")
        svc = DiscoveryService(db_session, redis_client)
        assert await svc.get_editor_picks() == []


class TestDiscoveryRecommendations:
    """个性化推荐已迁移至 recommend_service，旧接口测试改为冷启动验证。"""

    async def test_hot_ranking_recommendations(self, db_session, redis_client):
        await _add_published_novel(db_session, title="推荐书", click_count=5000)
        svc = DiscoveryService(db_session, redis_client)
        result = await svc.get_ranking("hot", 6)
        assert len(result) == 1
        assert result[0].rank == 1


class TestCategoryTree:
    async def test_nested_categories_built_as_tree(self, db_session, redis_client):
        from app.models.novel import Category

        parent = Category(code="parent", name="父类", parent_id=0, icon="", novel_count=2)
        db_session.add(parent)
        await db_session.flush()
        child = Category(code="child", name="子类", parent_id=parent.id, icon="", novel_count=1)
        db_session.add(child)
        await db_session.commit()

        svc = DiscoveryService(db_session, redis_client)
        tree = await svc.get_categories()
        assert len(tree) == 1
        assert tree[0].name == "父类"
        assert tree[0].children and tree[0].children[0].name == "子类"
