"""角色权限服务测试：角色列表、详情、权限分配、元信息更新。"""

import pytest

from app.core.exceptions import BizError, NotFoundError
from app.models.permission import Permission, Role, RolePermission
from app.schemas.b_end import UpdateRoleMetaBody, UpdateRolePermissionsBody
from app.services.role_service import RoleService


@pytest.fixture
def svc(db_session):
    return RoleService(db_session)


async def _create_role(session, **kwargs):
    defaults = {
        "role_key": "test-role",
        "name": "测试角色",
        "description": "测试用",
        "data_scope": "self",
        "builtin": 0,
        "user_count": 0,
    }
    defaults.update(kwargs)
    role = Role(**defaults)
    session.add(role)
    await session.flush()
    return role


async def _create_permission(session, **kwargs):
    defaults = {
        "perm_key": "test.perm",
        "label": "测试权限",
        "module": "test",
        "description": "测试用",
    }
    defaults.update(kwargs)
    perm = Permission(**defaults)
    session.add(perm)
    await session.flush()
    return perm


class TestListRoles:
    async def test_list_empty(self, svc):
        roles = await svc.list_roles()
        assert len(roles) == 0

    async def test_list_with_data(self, svc, db_session):
        await _create_role(db_session)
        roles = await svc.list_roles()
        assert len(roles) == 1
        assert roles[0].role_key == "test-role"

    async def test_list_multiple_roles(self, svc, db_session):
        await _create_role(db_session, role_key="role-a", name="角色A")
        await _create_role(db_session, role_key="role-b", name="角色B")
        roles = await svc.list_roles()
        assert len(roles) == 2


class TestGetDetail:
    async def test_get_detail_success(self, svc, db_session):
        await _create_role(db_session, role_key="admin", name="管理员")
        detail = await svc.get_detail("admin")
        assert detail.role_key == "admin"
        assert detail.name == "管理员"
        assert detail.builtin is False

    async def test_get_detail_not_found(self, svc):
        with pytest.raises(NotFoundError):
            await svc.get_detail("nonexistent")

    async def test_get_detail_with_permissions(self, svc, db_session):
        await _create_role(db_session, role_key="editor")
        await _create_permission(db_session, perm_key="novel.edit")
        await _create_permission(db_session, perm_key="chapter.edit")
        rp = RolePermission(role_key="editor", perm_key="novel.edit")
        db_session.add(rp)
        rp2 = RolePermission(role_key="editor", perm_key="chapter.edit")
        db_session.add(rp2)
        await db_session.flush()
        detail = await svc.get_detail("editor")
        assert "novel.edit" in detail.permissions
        assert "chapter.edit" in detail.permissions


class TestUpdatePermissions:
    async def test_update_permissions_success(self, svc, db_session):
        await _create_role(db_session, role_key="editor")
        await _create_permission(db_session, perm_key="novel.edit")
        await _create_permission(db_session, perm_key="novel.list")
        body = UpdateRolePermissionsBody(permissions=["novel.list", "novel.edit"])
        result = await svc.update_permissions("editor", body)
        assert "novel.list" in result.permissions
        assert "novel.edit" in result.permissions

    async def test_update_permissions_not_found(self, svc):
        body = UpdateRolePermissionsBody(permissions=["novel.list"])
        with pytest.raises(NotFoundError):
            await svc.update_permissions("nonexistent", body)

    async def test_update_permissions_builtin_raises(self, svc, db_session):
        await _create_role(db_session, role_key="super-admin", builtin=1)
        body = UpdateRolePermissionsBody(permissions=[])
        with pytest.raises(BizError):
            await svc.update_permissions("super-admin", body)

    async def test_update_permissions_clear_all(self, svc, db_session):
        await _create_role(db_session, role_key="editor")
        await _create_permission(db_session, perm_key="novel.edit")
        rp = RolePermission(role_key="editor", perm_key="novel.edit")
        db_session.add(rp)
        await db_session.flush()
        body = UpdateRolePermissionsBody(permissions=[])
        result = await svc.update_permissions("editor", body)
        assert len(result.permissions) == 0


class TestUpdateMeta:
    async def test_update_meta_success(self, svc, db_session):
        await _create_role(db_session, role_key="editor", name="旧名")
        body = UpdateRoleMetaBody(name="新名称", description="新描述")
        result = await svc.update_meta("editor", body)
        assert result.name == "新名称"
        assert result.description == "新描述"

    async def test_update_meta_not_found(self, svc):
        body = UpdateRoleMetaBody(name="新名称")
        with pytest.raises(NotFoundError):
            await svc.update_meta("nonexistent", body)

    async def test_update_meta_builtin_data_scope_raises(self, svc, db_session):
        await _create_role(db_session, role_key="super-admin", builtin=1)
        body = UpdateRoleMetaBody(name="新名称", data_scope="all")
        with pytest.raises(BizError):
            await svc.update_meta("super-admin", body)


class TestListPermissions:
    async def test_list_permissions_empty(self, svc):
        perms = await svc.list_permissions()
        assert len(perms) == 0

    async def test_list_permissions_with_data(self, svc, db_session):
        await _create_permission(db_session, perm_key="novel.list")
        await _create_permission(db_session, perm_key="novel.create")
        perms = await svc.list_permissions()
        assert len(perms) == 2
        keys = [p.key for p in perms]
        assert "novel.list" in keys
        assert "novel.create" in keys


class TestBuiltinPermissions:
    async def test_get_builtin_permissions(self, svc):
        result = svc.get_builtin_permissions()
        assert "super-admin" in result
        assert "content-admin" in result
        assert "novel.list" in result["super-admin"]
