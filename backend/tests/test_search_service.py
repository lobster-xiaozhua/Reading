"""搜索服务测试：搜索建议、书籍搜索、热搜词、缓存。"""

import json

import pytest

from app.core.redis import CacheKeys
from app.models.novel import Novel, Tag
from app.services.search_service import SearchService, _pinyin_match, _to_pinyin


@pytest.fixture
def svc(db_session, redis_client):
    return SearchService(db_session, redis_client)


async def _create_published_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 50000,
        "click_count": 100,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


class TestGetSuggestions:
    async def test_empty_keyword(self, svc):
        result = await svc.get_suggestions("")
        assert result == []
        result = await svc.get_suggestions("   ")
        assert result == []

    async def test_suggestions_by_book_title(self, svc, db_session):
        await _create_published_novel(db_session, title="玄幻之巅")
        result = await svc.get_suggestions("玄幻")
        book_suggestions = [s for s in result if s.type == "book"]
        assert len(book_suggestions) >= 1
        assert book_suggestions[0].text == "玄幻之巅"

    async def test_suggestions_by_author(self, svc, db_session):
        await _create_published_novel(db_session, author_name="金庸新")
        result = await svc.get_suggestions("金庸")
        author_suggestions = [s for s in result if s.type == "author"]
        assert len(author_suggestions) >= 1

    async def test_suggestions_by_tag(self, svc, db_session):
        tag = Tag(name="热血", ref_count=1)
        db_session.add(tag)
        await db_session.flush()
        result = await svc.get_suggestions("热血")
        tag_suggestions = [s for s in result if s.type == "tag"]
        assert len(tag_suggestions) >= 1

    async def test_suggestions_uses_cache(self, svc, db_session, redis_client):
        key = CacheKeys.search_suggestion("测试")
        cached = json.dumps([{"type": "book", "text": "缓存结果", "book_id": "1"}])
        await redis_client.set(key, cached, ex=60)
        result = await svc.get_suggestions("测试")
        assert len(result) == 1
        assert result[0].text == "缓存结果"

    async def test_suggestions_max_limit(self, svc, db_session):
        for i in range(10):
            await _create_published_novel(db_session, title=f"测试小说{i}")
        result = await svc.get_suggestions("测试")
        assert len(result) <= 8


class TestSearchBooks:
    async def test_search_empty_keyword(self, svc):
        result = await svc.search_books("")
        assert result.total == 0
        assert len(result.items) == 0

    async def test_search_with_results(self, svc, db_session):
        await _create_published_novel(db_session, title="玄幻之巅")
        await _create_published_novel(db_session, title="玄幻世界")
        result = await svc.search_books("玄幻")
        assert result.total == 2
        assert len(result.items) == 2

    async def test_search_pagination(self, svc, db_session):
        for i in range(5):
            await _create_published_novel(db_session, title=f"测试{i}")
        result = await svc.search_books("测试", page=1, page_size=2)
        assert len(result.items) == 2
        assert result.total == 5
        assert result.hasMore is True

    async def test_search_no_results(self, svc):
        result = await svc.search_books("不存在的小说")
        assert result.total == 0
        assert len(result.items) == 0

    async def test_search_only_published(self, svc, db_session):
        await _create_published_novel(db_session, title="公开", status="published")
        await _create_published_novel(db_session, title="草稿", status="draft")
        result = await svc.search_books("公开")
        assert result.total == 1
        result = await svc.search_books("草稿")
        assert result.total == 0


class TestHotSearches:
    async def test_hot_searches_empty(self, svc):
        result = await svc.get_hot_searches()
        assert result == []

    async def test_hot_searches_from_cache(self, svc, redis_client):
        await redis_client.set(CacheKeys.HOT_SEARCHES, json.dumps(["热搜1", "热搜2"]), ex=300)
        result = await svc.get_hot_searches()
        assert result == ["热搜1", "热搜2"]

    async def test_hot_searches_from_zset(self, svc, redis_client):
        for i, keyword in enumerate(["热门A", "热门B", "热门C"]):
            await redis_client.zincrby(CacheKeys.SEARCH_HOT_ZSET, 10 - i, keyword)
        result = await svc.get_hot_searches(limit=2)
        assert len(result) == 2
        assert result[0] == "热门A"

    async def test_hot_searches_filters_short_words(self, svc, redis_client):
        await redis_client.zincrby(CacheKeys.SEARCH_HOT_ZSET, 5, "A")
        await redis_client.zincrby(CacheKeys.SEARCH_HOT_ZSET, 5, "玄幻")
        result = await svc.get_hot_searches()
        assert "A" not in result
        assert "玄幻" in result


class TestRecordSearch:
    async def test_record_search_increments(self, svc, redis_client):
        await svc._record_search("测试关键词")
        score = await redis_client.zscore(CacheKeys.SEARCH_HOT_ZSET, "测试关键词")
        assert score == 1.0

    async def test_record_search_accumulates(self, svc, redis_client):
        for _ in range(3):
            await svc._record_search("热门词")
        score = await redis_client.zscore(CacheKeys.SEARCH_HOT_ZSET, "热门词")
        assert score == 3.0


class TestSearchNovels:
    async def test_internal_search(self, svc, db_session):
        await _create_published_novel(db_session, title="唯一结果")
        novels, total = await svc._search_novels("唯一", 1, 10)
        assert total == 1
        assert len(novels) == 1
        assert novels[0].title == "唯一结果"

    async def test_internal_search_empty(self, svc):
        novels, total = await svc._search_novels("", 1, 10)
        assert total == 0
        assert len(novels) == 0


class TestPinyinSearch:
    async def test_to_pinyin(self):
        assert _to_pinyin("玄幻之巅") == "xuanhuanzhidian"

    async def test_pinyin_match_hits(self, db_session, svc):
        await _create_published_novel(db_session, title="玄幻之巅")
        novels, total = await svc._search_novels("xuanhuan", 1, 10)
        assert total == 1
        assert novels[0].title == "玄幻之巅"

    async def test_pinyin_match_only_ascii_keyword(self, db_session, svc):
        await _create_published_novel(db_session, title="玄幻之巅")
        novels, total = await svc._search_novels("玄幻", 1, 10)
        assert total == 1

    async def test_pinyin_match_no_hit(self, db_session, svc):
        await _create_published_novel(db_session, title="玄幻之巅")
        novels, total = await svc._search_novels("xuanhuanwuxian", 1, 10)
        assert total == 0

    async def test_pinyin_helper_non_ascii(self, db_session):
        await _create_published_novel(db_session, title="玄幻之巅")
        assert _pinyin_match([], "玄幻") == []

    async def test_pinyin_suggestions(self, db_session, svc):
        await _create_published_novel(db_session, title="凡人修仙传")
        result = await svc.get_suggestions("fanren")
        book_suggestions = [s for s in result if s.type == "book"]
        assert any(s.text == "凡人修仙传" for s in book_suggestions)

    async def test_pinyin_match_with_shared_prefix(self, db_session, svc):
        await _create_published_novel(db_session, title="九星霸体诀")
        novels, total = await svc._search_novels("jiuxing", 1, 10)
        assert total == 1
        assert novels[0].title == "九星霸体诀"
