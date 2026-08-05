"""审核服务测试：审核队列、审核历史、提交审核结果。"""

from datetime import datetime

import pytest

from app.models.audit import AuditRecord
from app.models.novel import Chapter, Novel
from app.schemas.b_end import AuditSubmitBody
from app.schemas.enums import AuditLevel
from app.services.audit_service import AuditService


@pytest.fixture
def svc(db_session):
    return AuditService(db_session)


async def _create_audit_record(session, **kwargs):
    defaults = {
        "target_type": "novel",
        "target_id": 1,
        "level": AuditLevel.SECOND,
        "status": "pending",
        "operator_id": 0,
        "operator_name": "system",
        "submitted_at": int(datetime.now().timestamp() * 1000),
    }
    defaults.update(kwargs)
    record = AuditRecord(**defaults)
    session.add(record)
    await session.flush()
    return record


async def _create_novel(session, **kwargs):
    defaults = {
        "title": "测试小说",
        "author_name": "测试作者",
        "category": "xuanhuan",
        "status": "published",
        "word_count": 10000,
    }
    defaults.update(kwargs)
    novel = Novel(**defaults)
    session.add(novel)
    await session.flush()
    return novel


async def _create_chapter(session, novel_id, **kwargs):
    defaults = {
        "novel_id": novel_id,
        "index": 1,
        "title": "第一章",
        "content": "第一章内容",
        "status": "pending",
        "word_count": 500,
    }
    defaults.update(kwargs)
    chapter = Chapter(**defaults)
    session.add(chapter)
    await session.flush()
    return chapter


class TestAuditQueue:
    async def test_get_queue_empty(self, svc):
        result = await svc.get_queue()
        assert len(result.items) == 0
        assert result.stats.pending_count == 0

    async def test_get_queue_with_data(self, svc, db_session):
        await _create_audit_record(db_session, target_type="novel", target_id=1)
        result = await svc.get_queue()
        assert len(result.items) == 1
        assert result.stats.pending_count == 1

    async def test_get_queue_filters_by_level(self, svc, db_session):
        await _create_audit_record(
            db_session, target_type="novel", target_id=1, level=AuditLevel.SECOND
        )
        await _create_audit_record(
            db_session, target_type="novel", target_id=2, level=AuditLevel.FINAL
        )
        result = await svc.get_queue(level="second")
        assert len(result.items) == 1
        assert result.items[0].level == AuditLevel.SECOND


class TestAuditHistory:
    async def test_get_history_empty(self, svc, db_session):
        record = await _create_audit_record(db_session)
        history = await svc.get_history(record.id)
        assert len(history) == 0

    async def test_get_history_with_data(self, svc, db_session):
        from app.repositories.audit_repo import AuditRepository

        repo = AuditRepository(db_session)
        record = await _create_audit_record(db_session)
        await repo.add_history(record.id, 1, "管理员", "approved", "内容合格", "")
        history = await svc.get_history(record.id)
        assert len(history) == 1
        assert history[0].result == "approved"
        assert history[0].operator_name == "管理员"


class TestAuditSubmit:
    async def test_submit_approve_chapter(self, svc, db_session):
        novel = await _create_novel(db_session)
        chapter = await _create_chapter(db_session, novel.id)
        record = await _create_audit_record(
            db_session,
            target_type="chapter",
            target_id=chapter.id,
        )
        body = AuditSubmitBody(ids=[str(record.id)], result="approve", comment="通过")
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is True
        await db_session.refresh(chapter)
        assert chapter.status == "published"

    async def test_submit_reject_chapter(self, svc, db_session):
        novel = await _create_novel(db_session)
        chapter = await _create_chapter(db_session, novel.id)
        record = await _create_audit_record(
            db_session,
            target_type="chapter",
            target_id=chapter.id,
        )
        body = AuditSubmitBody(
            ids=[str(record.id)], result="reject", comment="内容不符", reject_reason="other"
        )
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is True
        await db_session.refresh(chapter)
        assert chapter.status == "draft"

    async def test_submit_approve_novel(self, svc, db_session):
        record = await _create_audit_record(db_session, target_type="novel", target_id=1)
        body = AuditSubmitBody(ids=[str(record.id)], result="approve", comment="通过")
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is True

    async def test_submit_nonexistent_record(self, svc, db_session):
        body = AuditSubmitBody(ids=["99999"], result="approve", comment="通过")
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is False
        assert result.failed is not None
        assert len(result.failed) == 1

    async def test_submit_already_processed_record(self, svc, db_session):
        record = await _create_audit_record(db_session, status="approved")
        body = AuditSubmitBody(ids=[str(record.id)], result="approve", comment="")
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is False

    async def test_submit_multiple_ids(self, svc, db_session):
        novel = await _create_novel(db_session)
        r1 = await _create_audit_record(db_session, target_type="novel", target_id=1)
        chapter = await _create_chapter(db_session, novel.id)
        r2 = await _create_audit_record(
            db_session,
            target_type="chapter",
            target_id=chapter.id,
        )
        body = AuditSubmitBody(ids=[str(r1.id), str(r2.id)], result="approve", comment="批量通过")
        result = await svc.submit_audit(body, 1, "审核员")
        assert result.success is True


class TestRecordToItem:
    async def _to_item(self, svc, record):
        items = await svc._records_to_items([record])
        return items[0]

    async def test_novel_record_to_item(self, svc, db_session):
        novel = await _create_novel(db_session)
        record = await _create_audit_record(db_session, target_type="novel", target_id=novel.id)
        item = await self._to_item(svc, record)
        assert item.target_type == "novel"
        assert item.novel_title == novel.title
        assert item.author == novel.author_name

    async def test_chapter_record_to_item(self, svc, db_session):
        novel = await _create_novel(db_session)
        chapter = await _create_chapter(db_session, novel.id, content_text="第一章内容", content="")
        record = await _create_audit_record(
            db_session,
            target_type="chapter",
            target_id=chapter.id,
        )
        item = await self._to_item(svc, record)
        assert item.target_type == "chapter"
        assert item.chapter_title == chapter.title
        assert item.novel_title == novel.title
        assert item.content == chapter.content_text

    async def test_record_with_sensitive_hits(self, svc, db_session):
        import json

        hits = json.dumps(
            [
                {"text": "违规词", "level": 1, "offset": 0, "suggestion": "删除"},
            ]
        )
        record = await _create_audit_record(
            db_session,
            target_type="novel",
            target_id=1,
            sensitive_hits=hits,
        )
        item = await self._to_item(svc, record)
        assert len(item.sensitive_hits) == 1
        assert item.sensitive_hits[0].text == "违规词"
        assert item.sensitive_hits[0].level == 1

    async def test_record_with_invalid_sensitive_hits(self, svc, db_session):
        record = await _create_audit_record(
            db_session,
            target_type="novel",
            target_id=1,
            sensitive_hits="invalid json",
        )
        item = await self._to_item(svc, record)
        assert len(item.sensitive_hits) == 0

    async def test_record_not_found(self, svc, db_session):
        novel = await _create_novel(db_session, id=999)
        record = await _create_audit_record(db_session, target_type="novel", target_id=999)
        await db_session.delete(novel)
        await db_session.flush()
        item = await self._to_item(svc, record)
        assert item.target_title == ""


class TestGetQueueNoNPlusOne:
    async def test_get_queue_query_count_bounded(self, svc, db_session, db_query_counter):
        """批量转换记录不应随条数线性增加 DB 查询（N+1 回归防护）。"""
        counts, reset = db_query_counter
        novel = await _create_novel(db_session)
        chapters = [await _create_chapter(db_session, novel.id, index=i) for i in range(1, 31)]
        for _ in range(30):
            await _create_audit_record(db_session, target_type="novel", target_id=novel.id)
        for c in chapters:
            await _create_audit_record(db_session, target_type="chapter", target_id=c.id)

        reset()
        result = await svc.get_queue()

        assert result.stats.pending_count == 60
        # 批量加载实现下查询次数有恒定上界（list_queue + stats + 2~3 次 in_ 查询）
        assert counts[0] <= 15


class TestGetNextId:
    async def test_get_next_id(self, svc, db_session):
        r1 = await _create_audit_record(db_session, target_type="novel", target_id=1)
        r2 = await _create_audit_record(db_session, target_type="novel", target_id=2)
        next_id = await svc._get_next_id(r1.id)
        assert next_id == str(r2.id)

    async def test_get_next_id_no_more(self, svc, db_session):
        record = await _create_audit_record(db_session, target_type="novel", target_id=1)
        next_id = await svc._get_next_id(record.id)
        assert next_id is None
