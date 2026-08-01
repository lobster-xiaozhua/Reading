"""作品服务测试（B 端，状态机 + CRUD）。"""

import pytest

from app.core.exceptions import BizError, NotFoundError
from app.models.novel import Novel
from app.schemas.b_end import NovelListParams, NovelSubmitBody
from app.schemas.enums import BookFlag
from app.services.novel_service import NovelService


@pytest.fixture
def svc(db_session):
    return NovelService(db_session)


async def _create_novel(session, **kwargs):
    """创建测试作品。"""
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "draft",
        "word_count": 10000,
        "rating": 4.5,
        "is_completed": 0,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


class TestNovelServiceList:
    async def test_list_empty(self, svc):
        params = NovelListParams()
        result = await svc.list_novels(params)
        assert result.total == 0
        assert len(result.items) == 0

    async def test_list_with_data(self, svc, db_session):
        await _create_novel(db_session, title="小说A")
        await _create_novel(db_session, title="小说B")
        result = await svc.list_novels(NovelListParams())
        assert result.total == 2

    async def test_list_search_by_key(self, svc, db_session):
        await _create_novel(db_session, title="玄幻之巅")
        await _create_novel(db_session, title="都市奇才")
        result = await svc.list_novels(NovelListParams(search_key="玄幻"))
        assert result.total == 1
        assert result.items[0].title == "玄幻之巅"

    async def test_list_filter_by_status(self, svc, db_session):
        await _create_novel(db_session, title="草稿", status="draft")
        await _create_novel(db_session, title="已发布", status="published")
        result = await svc.list_novels(NovelListParams(status="published"))
        assert result.total == 1
        assert result.items[0].title == "已发布"


class TestNovelServiceDetail:
    async def test_get_detail_success(self, svc, db_session):
        novel = await _create_novel(db_session, title="详情测试")
        detail = await svc.get_detail(novel.id)
        assert detail.title == "详情测试"
        assert detail.id == str(novel.id)

    async def test_get_detail_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.get_detail(99999)


class TestNovelServiceSubmit:
    async def test_create_novel(self, svc):
        body = NovelSubmitBody(
            title="新作品",
            category="xuanhuan",
            flags=[BookFlag.VIP],
            price=9.9,
        )
        detail = await svc.submit_novel(body)
        assert detail.title == "新作品"
        assert detail.status == "draft"
        assert BookFlag.VIP in detail.flags

    async def test_update_novel(self, svc, db_session):
        novel = await _create_novel(db_session, title="原标题")
        body = NovelSubmitBody(title="新标题", category="urban")
        detail = await svc.submit_novel(body, novel.id)
        assert detail.title == "新标题"
        assert detail.category == "urban"


class TestNovelServiceBatchOperate:
    async def test_batch_submit_audit_success(self, svc, db_session):
        n1 = await _create_novel(db_session, title="A")
        n2 = await _create_novel(db_session, title="B")
        result = await svc.batch_result([n1.id, n2.id], "submit-audit")
        assert result.success is True
        assert result.affected == 2

    async def test_batch_submit_audit_invalid_status(self, svc, db_session):
        n1 = await _create_novel(db_session, title="A", status="published")
        result = await svc.batch_result([n1.id], "submit-audit")
        assert result.success is False
        assert result.failed is not None

    async def test_batch_delete(self, svc, db_session):
        n1 = await _create_novel(db_session, title="A")
        result = await svc.batch_result([n1.id], "delete")
        assert result.affected == 1

    async def test_batch_shelve(self, svc, db_session):
        n1 = await _create_novel(db_session, title="A", status="published")
        result = await svc.batch_result([n1.id], "shelve", reason="violation")
        assert result.affected == 1


class TestNovelServiceTransition:
    async def test_transition_draft_to_pending(self, svc, db_session):
        novel = await _create_novel(db_session, status="draft")
        detail = await svc.transition(novel.id, "pending")
        assert detail.status == "pending"

    async def test_transition_invalid_raises(self, svc, db_session):
        novel = await _create_novel(db_session, status="draft")
        with pytest.raises(BizError):
            await svc.transition(novel.id, "published")
