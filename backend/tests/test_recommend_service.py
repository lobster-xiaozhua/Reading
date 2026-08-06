"""个性化推荐服务测试：协同过滤、冷启动、类别回退。"""

from app.models.novel import Novel
from app.models.reading import ReadingHistory
from app.services.recommend_service import RecommendService, _cf_score, _cold_score


async def _novel(session, title, category="xuanhuan", click_count=100, rating=4.0, **kw):
    defaults = {
        "title": title,
        "author_name": "作者",
        "category": category,
        "status": "published",
        "word_count": 1000,
        "click_count": click_count,
        "rating": rating,
    }
    defaults.update(kw)
    n = Novel(**defaults)
    session.add(n)
    await session.flush()
    return n


async def _history(session, reader_id, novel_id, read_at=1):
    h = ReadingHistory(
        reader_id=reader_id, novel_id=novel_id, chapter_id=0, chapter_index=0, percent=0.0, read_at=read_at
    )
    session.add(h)
    await session.flush()
    return h


class TestColdStart:
    async def test_no_history_returns_hot(self, db_session, redis_client):
        for i in range(3):
            await _novel(db_session, f"热门{i}", click_count=100 - i)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=2)
        assert len(result) == 2
        assert all(r.match_score > 0 for r in result)

    async def test_no_history_empty(self, db_session, redis_client):
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        assert result == []


class TestCollaborativeFiltering:
    async def test_suggests_books_read_by_similar_readers(self, db_session, redis_client):
        a = await _novel(db_session, "共同阅读书")
        b = await _novel(db_session, "相似读者读的书")
        await _history(db_session, 1, a.id)
        await _history(db_session, 2, a.id)
        await _history(db_session, 2, b.id)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        titles = [r.book.title for r in result]
        assert "相似读者读的书" in titles

    async def test_excludes_already_read(self, db_session, redis_client):
        a = await _novel(db_session, "共同书")
        b = await _novel(db_session, "其他书")
        c = await _novel(db_session, "已读书")
        await _history(db_session, 1, a.id)
        await _history(db_session, 1, c.id)
        await _history(db_session, 2, a.id)
        await _history(db_session, 2, b.id)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        titles = [r.book.title for r in result]
        assert "已读书" not in titles
        assert "其他书" in titles

    async def test_only_published_returned(self, db_session, redis_client):
        a = await _novel(db_session, "共同书")
        b = await _novel(db_session, "草稿", status="draft")
        await _history(db_session, 1, a.id)
        await _history(db_session, 2, a.id)
        await _history(db_session, 2, b.id)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        assert all(r.book.title != "草稿" for r in result)

    async def test_match_score_bounded(self, db_session, redis_client):
        a = await _novel(db_session, "共同书")
        b = await _novel(db_session, "候选书")
        await _history(db_session, 1, a.id)
        for reader in range(3, 13):
            await _history(db_session, reader, a.id)
            await _history(db_session, reader, b.id)
        await _history(db_session, 2, a.id)
        await _history(db_session, 2, b.id)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        assert all(0 <= r.match_score <= 100 for r in result)


class TestCategoryFallback:
    async def test_no_similar_reader_uses_category_affinity(self, db_session, redis_client):
        a = await _novel(db_session, "已读玄幻", category="xuanhuan")
        _b = await _novel(db_session, "玄幻新书", category="xuanhuan")
        _c = await _novel(db_session, "都市书", category="dushi", click_count=99999)
        await _history(db_session, 1, a.id)
        svc = RecommendService(db_session, redis_client)
        result = await svc.get_recommendations(reader_id=1, limit=6)
        titles = [r.book.title for r in result]
        assert "玄幻新书" in titles
        assert "已读玄幻" not in titles
        assert "都市书" in titles  # 全局热门补齐


class TestHelpers:
    def test_cf_score_range(self):
        assert _cf_score(5, 10) == 80
        assert _cf_score(10, 10) == 100
        assert _cf_score(0, 0) == 60

    def test_cold_score_boost(self):
        novel = Novel(
            title="x", author_name="a", category="xuanhuan", status="published",
            word_count=1, click_count=20000, rating=5.0,
        )
        assert _cold_score(novel) == 100
