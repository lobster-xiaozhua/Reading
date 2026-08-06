"""B 端用户管理服务测试（列表搜索、分页、封禁/解封）。"""

import pytest

from app.models.user import Reader
from app.services.user_service import UserService


@pytest.fixture
def svc(db_session):
    return UserService(db_session)


async def _add_reader(session, username, nickname, **kw):
    defaults = {"avatar": "", "level": 1, "is_vip": 0}
    defaults.update(kw)
    reader = Reader(username=username, nickname=nickname, **defaults)
    session.add(reader)
    await session.flush()
    return reader


class TestListUsers:
    async def test_list_all(self, svc, db_session):
        await _add_reader(db_session, "alice", "爱丽丝")
        await _add_reader(db_session, "bob", "鲍勃")
        result = await svc.list_users(page=1, page_size=20)
        assert result.total == 2
        assert len(result.items) == 2

    async def test_search_by_username(self, svc, db_session):
        await _add_reader(db_session, "alice", "爱丽丝")
        await _add_reader(db_session, "bob", "鲍勃")
        result = await svc.list_users(search_key="alice")
        assert result.total == 1
        assert result.items[0].username == "alice"

    async def test_search_by_nickname(self, svc, db_session):
        await _add_reader(db_session, "alice", "爱丽丝")
        result = await svc.list_users(search_key="爱丽丝")
        assert result.total == 1

    async def test_list_excludes_deleted(self, svc, db_session):
        await _add_reader(db_session, "alice", "爱丽丝", deleted=1)
        await _add_reader(db_session, "bob", "鲍勃")
        result = await svc.list_users()
        assert result.total == 1
        assert result.items[0].username == "bob"

    async def test_pagination_has_more(self, svc, db_session):
        for i in range(5):
            await _add_reader(db_session, f"user{i}", f"昵称{i}")
        result = await svc.list_users(page=1, page_size=2)
        assert len(result.items) == 2
        assert result.page == 1
        assert result.pageSize == 2
        assert result.hasMore is True

    async def test_empty(self, svc):
        result = await svc.list_users()
        assert result.total == 0
        assert result.items == []


class TestSetStatus:
    async def test_ban_reader(self, svc, db_session):
        reader = await _add_reader(db_session, "alice", "爱丽丝")
        assert await svc.set_status(reader.id, 0) is True
        await db_session.refresh(reader)
        assert reader.deleted == 1

    async def test_unban_reader(self, svc, db_session):
        reader = await _add_reader(db_session, "alice", "爱丽丝", deleted=1)
        assert await svc.set_status(reader.id, 1) is True
        await db_session.refresh(reader)
        assert reader.deleted == 0

    async def test_not_found(self, svc):
        assert await svc.set_status(99999, 1) is False
