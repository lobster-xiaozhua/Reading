"""稿费服务测试。"""

import pytest

from app.core.exceptions import BizError
from app.models.royalty import RoyaltyDetail
from app.services.royalty_service import RoyaltyService


@pytest.fixture
def svc(db_session):
    return RoyaltyService(db_session)


async def _create_detail(session, **kwargs):
    defaults = {
        "month": "2026-08",
        "novel_id": 1,
        "author_id": 1,
        "chapter_count": 5,
        "word_count": 10000,
        "contract_type": "buyout",
        "rate": 100.0,
        "subscription_revenue": 500.0,
        "amount": 1000.0,
        "status": "pending",
        "created_at": 0,
    }
    defaults.update(kwargs)
    detail = RoyaltyDetail(**defaults)
    session.add(detail)
    await session.flush()
    return detail


class TestRoyaltyServiceList:
    async def test_list_empty(self, svc):
        result = await svc.list_royalties()
        assert len(result.items) == 0

    async def test_list_with_data(self, svc, db_session):
        await _create_detail(db_session, month="2026-08")
        await _create_detail(db_session, month="2026-07")
        result = await svc.list_royalties()
        assert len(result.items) == 2

    async def test_list_filter_by_month(self, svc, db_session):
        await _create_detail(db_session, month="2026-08")
        await _create_detail(db_session, month="2026-07")
        result = await svc.list_royalties(month="2026-08")
        assert len(result.items) == 1

    async def test_list_filter_by_status(self, svc, db_session):
        await _create_detail(db_session, status="pending")
        await _create_detail(db_session, status="settled")
        result = await svc.list_royalties(status="settled")
        assert len(result.items) == 1

    async def test_list_pagination(self, svc, db_session):
        for i in range(5):
            await _create_detail(db_session, novel_id=i + 1)
        result = await svc.list_royalties(page=1, page_size=2)
        assert len(result.items) == 2


class TestRoyaltyServiceBatch:
    async def test_batch_settle(self, svc, db_session):
        d1 = await _create_detail(db_session, status="pending")
        d2 = await _create_detail(db_session, status="pending")
        result = await svc.batch_settle([d1.id, d2.id])
        assert result.success is True

    async def test_batch_settle_already_settled_skipped(self, svc, db_session):
        d = await _create_detail(db_session, status="settled")
        with pytest.raises(BizError):
            await svc.batch_settle([d.id])

    async def test_mark_withdrawn(self, svc, db_session):
        d = await _create_detail(db_session, status="settled")
        result = await svc.mark_withdrawn([d.id])
        assert result.success is True

    async def test_mark_withdrawn_invalid_status(self, svc, db_session):
        d = await _create_detail(db_session, status="pending")
        with pytest.raises(BizError):
            await svc.mark_withdrawn([d.id])
