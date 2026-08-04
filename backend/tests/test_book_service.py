"""书籍服务测试：详情、章节、评论、评分分布、相关推荐、缓存。"""

import json
from datetime import datetime

import pytest

from app.core.exceptions import BizError, NotFoundError
from app.core.redis import CacheKeys
from app.models.interaction import Comment as CommentModel
from app.models.interaction import Review as ReviewModel
from app.models.novel import Chapter, Novel
from app.models.user import Reader
from app.services.book_service import BookService, _chapter_to_content, _chapter_to_list_item


@pytest.fixture
def svc(db_session, redis_client):
    return BookService(db_session, redis_client)


async def _create_published_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 50000,
        "rating": 4.5,
        "rating_count": 100,
        "click_count": 1000,
        "is_completed": 0,
        "flags": "hot",
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


async def _create_published_chapter(session, novel_id, **kwargs):
    defaults = {
        "novel_id": novel_id,
        "index": 1,
        "title": "第一章",
        "content": "第一段内容\n\n第二段内容\n\n第三段内容",
        "status": "published",
        "word_count": 500,
        "is_vip": 0,
        "published_at": int(datetime.now().timestamp() * 1000),
    }
    defaults.update(kwargs)
    chapter = Chapter(**defaults)
    session.add(chapter)
    await session.flush()
    return chapter


class TestGetBook:
    async def test_get_book_success(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        result = await svc.get_book(novel.id)
        assert result.title == "测试小说"
        assert result.author == "测试作者"

    async def test_get_book_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.get_book(99999)

    async def test_get_book_deleted(self, svc, db_session):
        novel = await _create_published_novel(db_session, deleted=1)
        with pytest.raises(NotFoundError):
            await svc.get_book(novel.id)

    async def test_get_book_draft(self, svc, db_session):
        novel = await _create_published_novel(db_session, status="draft")
        with pytest.raises(NotFoundError):
            await svc.get_book(novel.id)

    async def test_get_book_uses_cache(self, svc, db_session, redis_client):
        novel = await _create_published_novel(db_session)
        cache_key = CacheKeys.book(novel.id)
        cached = {
            "id": novel.id, "title": "缓存标题", "author_name": "缓存作者",
            "category": "xuanhuan", "status": "published", "word_count": 100,
            "is_completed": 0, "rating": 4.0, "rating_count": 10,
            "follow_count": 5, "click_count": 50, "flags": "",
            "updated_at": 1000000,
        }
        await redis_client.set(cache_key, json.dumps(cached), ex=600)
        result = await svc.get_book(novel.id)
        assert result.title == "缓存标题"

    async def test_get_book_writes_cache(self, svc, db_session, redis_client):
        novel = await _create_published_novel(db_session)
        await svc.get_book(novel.id)
        cache_key = CacheKeys.book(novel.id)
        cached = await redis_client.get(cache_key)
        assert cached is not None


class TestGetChapters:
    async def test_get_chapters_empty(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapters = await svc.get_chapters(novel.id)
        assert len(chapters) == 0

    async def test_get_chapters_with_data(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        await _create_published_chapter(db_session, novel.id)
        chapters = await svc.get_chapters(novel.id)
        assert len(chapters) == 1
        assert chapters[0].title == "第一章"

    async def test_get_chapters_only_published(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        await _create_published_chapter(db_session, novel.id, status="draft")
        chapters = await svc.get_chapters(novel.id)
        assert len(chapters) == 0


class TestGetChapter:
    async def test_get_chapter_success(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id)
        result = await svc.get_chapter(novel.id, chapter.id)
        assert result.title == "第一章"
        assert len(result.paragraphs) == 3

    async def test_get_chapter_vip_locked(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id, is_vip=1)
        with pytest.raises(BizError):
            await svc.get_chapter(novel.id, chapter.id)

    async def test_get_chapter_vip_unlocked(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id, is_vip=1)
        result = await svc.get_chapter(novel.id, chapter.id, reader_vip=True)
        assert result.title == "第一章"

    async def test_get_chapter_not_found(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        with pytest.raises(NotFoundError):
            await svc.get_chapter(novel.id, 99999)

    async def test_get_chapter_navigation(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        c1 = await _create_published_chapter(db_session, novel.id, index=1, title="第一章")
        c2 = await _create_published_chapter(db_session, novel.id, index=2, title="第二章")
        result = await svc.get_chapter(novel.id, c1.id)
        assert result.next_id == str(c2.id)
        assert result.prev_id is None


class TestRelatedBooks:
    async def test_get_related_books(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        await _create_published_novel(db_session, title="同类小说", category="xuanhuan")
        result = await svc.get_related_books(novel.id)
        assert len(result) == 1
        assert result[0].title == "同类小说"

    async def test_get_related_books_no_result(self, svc, db_session):
        novel = await _create_published_novel(db_session, category="xuanhuan")
        await _create_published_novel(db_session, title="不同类", category="xianxia")
        result = await svc.get_related_books(novel.id)
        assert len(result) == 0


class TestComments:
    async def test_get_comments_empty(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        comments = await svc.get_comments(novel.id)
        assert len(comments) == 0

    async def test_get_comments_with_data(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        reader = Reader(id=1001, username="user1", nickname="读者1")
        db_session.add(reader)
        await db_session.flush()
        comment = CommentModel(novel_id=novel.id, reader_id=1001, content="好书", likes=5, status=1)
        db_session.add(comment)
        await db_session.flush()
        comments = await svc.get_comments(novel.id)
        assert len(comments) == 1
        assert comments[0].content == "好书"


class TestRatingDistribution:
    async def test_get_rating_distribution_empty(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        dist = await svc.get_rating_distribution(novel.id)
        assert dist.total == 0
        assert dist.average == 4.5

    async def test_get_rating_distribution_with_data(self, svc, db_session):
        novel = await _create_published_novel(db_session)
        for star in [5, 5, 4, 3]:
            review = ReviewModel(novel_id=novel.id, reader_id=1, rating=star, content="ok")
            db_session.add(review)
        await db_session.flush()
        dist = await svc.get_rating_distribution(novel.id)
        assert dist.total == 4
        assert dist.buckets[0].star == 5
        assert dist.buckets[0].count == 2

    async def test_get_rating_distribution_cached(self, svc, db_session, redis_client):
        novel = await _create_published_novel(db_session)
        from app.schemas.c_end import RatingDistribution
        cached = RatingDistribution(total=10, average=4.0, buckets=[])
        await redis_client.set(CacheKeys.book_rating(novel.id), cached.model_dump_json(), ex=600)
        dist = await svc.get_rating_distribution(novel.id)
        assert dist.total == 10


class TestHelpers:
    async def test_chapter_to_list_item(self, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id)
        item = _chapter_to_list_item(chapter, novel.id)
        assert item.title == "第一章"
        assert int(item.book_id) == novel.id

    async def test_chapter_to_content(self, db_session):
        novel = await _create_published_novel(db_session)
        chapter = await _create_published_chapter(db_session, novel.id)
        content = _chapter_to_content(chapter, novel.id, None, None)
        assert len(content.paragraphs) == 3
        assert content.prev_id is None
        assert content.next_id is None
