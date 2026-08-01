"""章节服务测试（字数统计 + 状态机 + CRUD）。"""

import pytest

from app.core.exceptions import BizError, NotFoundError
from app.models.novel import Chapter, Novel
from app.schemas.b_end import (
    ChapterReorderBody,
    ChapterSubmitBody,
    ChapterTransitionBody,
    ChapterUpdateBody,
)
from app.services.chapter_service import ChapterService, _count_words


@pytest.fixture
def svc(db_session):
    return ChapterService(db_session)


async def _create_novel_and_chapters(session, count=3):
    """创建测试作品与章节。"""
    novel = Novel(title="测试", status="published", word_count=100)
    session.add(novel)
    await session.flush()
    chapters = []
    for i in range(count):
        ch = Chapter(
            novel_id=novel.id,
            index=i,
            title=f"第{i + 1}章",
            content=f"内容{i}",
            word_count=100,
            status="draft",
        )
        session.add(ch)
        chapters.append(ch)
    await session.flush()
    return novel, chapters


class TestWordCount:
    def test_empty_content(self):
        assert _count_words("") == (0, 0, 0)

    def test_plain_text(self):
        total, pure, _punct = _count_words("你好世界hello")
        # 你好世界=4 中文，hello=5 英文，共 9 纯文字
        assert pure == 9
        # 含标点字数 = 总字数（非空白字符）
        assert total == 9

    def test_html_stripped(self):
        _total, pure, _punct = _count_words("<p>测试文本</p>")
        assert pure == 4


class TestChapterServiceList:
    async def test_list_chapters(self, svc, db_session):
        novel, _chapters = await _create_novel_and_chapters(db_session, 3)
        items = await svc.list_chapters(novel.id)
        assert len(items) == 3
        assert items[0].index == 0
        assert items[2].index == 2

    async def test_list_empty(self, svc, db_session):
        novel = Novel(title="空作品", status="draft")
        db_session.add(novel)
        await db_session.flush()
        items = await svc.list_chapters(novel.id)
        assert items == []


class TestChapterServiceCreate:
    async def test_create_chapter(self, svc, db_session):
        novel = Novel(title="测试", status="draft")
        db_session.add(novel)
        await db_session.flush()
        body = ChapterSubmitBody(
            novel_id=str(novel.id),
            title="第一章",
            content="这是正文内容",
            is_vip=False,
        )
        detail = await svc.create_chapter(body)
        assert detail.title == "第一章"
        assert detail.index == 0
        assert detail.status == "draft"


class TestChapterServiceUpdate:
    async def test_update_title(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterUpdateBody(title="新标题")
        detail = await svc.update_chapter(chapters[0].id, body)
        assert detail.title == "新标题"

    async def test_update_content_recalculates_words(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterUpdateBody(content="全新的内容文字")
        detail = await svc.update_chapter(chapters[0].id, body)
        assert detail.word_count > 0


class TestChapterServiceReorder:
    async def test_reorder(self, svc, db_session):
        novel, chapters = await _create_novel_and_chapters(db_session, 3)
        # 反转顺序
        ordered = [str(c.id) for c in reversed(chapters)]
        body = ChapterReorderBody(ordered_ids=ordered)
        result = await svc.reorder_chapters(novel.id, body)
        assert result is True
        items = await svc.list_chapters(novel.id)
        assert items[0].id == ordered[0]


class TestChapterServiceTransition:
    async def test_transition_to_pending(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterTransitionBody(target="pending")
        detail = await svc.transition(chapters[0].id, body)
        assert detail.status == "pending"

    async def test_invalid_transition_raises(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        body = ChapterTransitionBody(target="published")
        with pytest.raises(BizError):
            await svc.transition(chapters[0].id, body)


class TestChapterServiceDelete:
    async def test_delete_draft_chapter(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        result = await svc.delete_chapter(chapters[0].id)
        assert result is True

    async def test_delete_published_requires_title_match(self, svc, db_session):
        _novel, chapters = await _create_novel_and_chapters(db_session, 1)
        chapters[0].status = "published"
        await db_session.flush()
        # 不匹配标题应抛异常
        with pytest.raises(BizError):
            await svc.delete_chapter(chapters[0].id, title_match="错误标题")
        # 匹配后可删除
        result = await svc.delete_chapter(chapters[0].id, title_match="第1章")
        assert result is True

    async def test_delete_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.delete_chapter(99999)
