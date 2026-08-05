"""角色权限仓储（§4.2.7）。"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.permission import Permission, Role, RolePermission


class RoleRepository:
    """角色仓储（Role 主键为 role_key，不继承泛型基类）。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self) -> list[Role]:
        """获取全部角色。"""
        result = await self.session.execute(select(Role))
        return list(result.scalars().all())

    async def get_by_key(self, role_key: str) -> Role | None:
        """根据角色主键获取角色信息。"""
        return await self.session.get(Role, role_key)

    async def get_permissions(self, role_key: str) -> list[str]:
        """获取指定角色的权限点列表。"""
        stmt = select(RolePermission.perm_key).where(RolePermission.role_key == role_key)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_permissions(self, role_key: str, perms: list[str]) -> None:
        """全量更新角色的权限点关联（先清空后写入）。"""
        # 清空旧关联
        old_stmt = select(RolePermission).where(RolePermission.role_key == role_key)
        result = await self.session.execute(old_stmt)
        for old in result.scalars().all():
            await self.session.delete(old)
        # 写入新关联
        for p in perms:
            self.session.add(RolePermission(role_key=role_key, perm_key=p))
        await self.session.flush()

    async def update_meta(
        self,
        role_key: str,
        *,
        name: str | None = None,
        description: str | None = None,
        data_scope: str | None = None,
    ) -> Role | None:
        """更新角色的元信息（名称/描述/数据范围），返回更新后的角色。"""
        role = await self.get_by_key(role_key)
        if not role:
            return None
        if name is not None:
            role.name = name
        if description is not None:
            role.description = description
        if data_scope is not None:
            role.data_scope = data_scope
        await self.session.flush()
        return role


class PermissionRepository:
    """权限点仓储。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_all(self) -> list[Permission]:
        """获取全部权限点。"""
        result = await self.session.execute(select(Permission))
        return list(result.scalars().all())
