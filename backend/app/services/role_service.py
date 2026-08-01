"""B 端角色权限服务（§4.2.7）。

提供角色列表、详情、权限分配、权限点清单。
内置角色不可删除，仅 super-admin 可分配权限。
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BizError, ErrorCode, NotFoundError
from app.repositories.role_repo import PermissionRepository, RoleRepository
from app.schemas.b_end import (
    PermissionItem,
    RoleDetail,
    RoleItem,
    UpdateRoleMetaBody,
    UpdateRolePermissionsBody,
)
from app.schemas.enums import BUILTIN_ROLE_PERMISSIONS

logger = logging.getLogger(__name__)


class RoleService:
    """B 端角色权限服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.role_repo = RoleRepository(session)
        self.perm_repo = PermissionRepository(session)

    # ── 角色列表 ─────────────────────────────────────────
    async def list_roles(self) -> list[RoleItem]:
        roles = await self.role_repo.list_all()
        return [
            RoleItem(
                role_key=r.role_key,
                name=r.name,
                description=r.description,
                data_scope=r.data_scope,
                builtin=bool(r.builtin),
                user_count=r.user_count,
            )
            for r in roles
        ]

    # ── 角色详情 ─────────────────────────────────────────
    async def get_detail(self, role_key: str) -> RoleDetail:
        role = await self.role_repo.get_by_key(role_key)
        if not role:
            raise NotFoundError("角色不存在")
        perms = await self.role_repo.get_permissions(role_key)
        return RoleDetail(
            role_key=role.role_key,
            name=role.name,
            description=role.description,
            data_scope=role.data_scope,
            builtin=bool(role.builtin),
            user_count=role.user_count,
            permissions=perms,
        )

    # ── 更新角色权限 ───────────────────────────────────────
    async def update_permissions(
        self, role_key: str, body: UpdateRolePermissionsBody
    ) -> RoleDetail:
        role = await self.role_repo.get_by_key(role_key)
        if not role:
            raise NotFoundError("角色不存在")
        if role.builtin:
            raise BizError(ErrorCode.ROLE_NOT_EDITABLE, "内置角色权限不可修改")
        await self.role_repo.update_permissions(role_key, body.permissions)
        await self.session.commit()
        return await self.get_detail(role_key)

    # ── 更新角色元信息 ─────────────────────────────────────
    async def update_meta(
        self, role_key: str, body: UpdateRoleMetaBody
    ) -> RoleDetail:
        role = await self.role_repo.get_by_key(role_key)
        if not role:
            raise NotFoundError("角色不存在")
        if role.builtin and body.data_scope:
            raise BizError(ErrorCode.ROLE_NOT_EDITABLE, "内置角色数据范围不可修改")
        updated = await self.role_repo.update_meta(
            role_key,
            name=body.name,
            description=body.description,
            data_scope=body.data_scope,
        )
        if not updated:
            raise NotFoundError("角色不存在")
        await self.session.commit()
        return await self.get_detail(role_key)

    # ── 全部权限点 ─────────────────────────────────────────
    async def list_permissions(self) -> list[PermissionItem]:
        perms = await self.perm_repo.list_all()
        return [
            PermissionItem(
                key=p.perm_key,
                label=p.label,
                module=p.module,
                description=p.description,
            )
            for p in perms
        ]

    # ── 内置角色权限映射 ───────────────────────────────────
    def get_builtin_permissions(self) -> dict[str, list[str]]:
        """返回内置角色-权限映射（供前端权限分配树参考）。"""
        return BUILTIN_ROLE_PERMISSIONS
