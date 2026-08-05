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
    db_session.add(
        Novel(
            title=title,
            category="xuanhuan",
            status="published",
            word_count=100,
            click_count=100,
            flags="hot",
            **kw,
        )
    )
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
        assert 0 < await redis_client.ttl(CacheKeys.CATEGORIES) <= 3600
        assert 0 < await redis_client.ttl(CacheKeys.TAGS) <= 3600

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
