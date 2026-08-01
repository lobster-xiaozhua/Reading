"""B 端角色权限路由。

对应前端 fetchRoleList / fetchRoleDetail / updateRolePermissions /
updateRoleMeta / fetchAllPermissions。
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.schemas.b_end import (
    UpdateRoleMetaBody,
    UpdateRolePermissionsBody,
)
from app.services.role_service import RoleService

router = APIRouter()


@router.get("/roles")
async def list_roles(
    request: Request,
    _admin=Depends(require_permission("permission.assign")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoleService(db)
    return ok(request, await svc.list_roles())


@router.get("/roles/{role_key}")
async def get_role_detail(
    request: Request,
    role_key: str,
    _admin=Depends(require_permission("permission.assign")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoleService(db)
    return ok(request, await svc.get_detail(role_key))


@router.put("/roles/{role_key}/permissions")
async def update_role_permissions(
    request: Request,
    role_key: str,
    body: UpdateRolePermissionsBody,
    _admin=Depends(require_permission("permission.assign")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoleService(db)
    return ok(request, await svc.update_permissions(role_key, body))


@router.patch("/roles/{role_key}")
async def update_role_meta(
    request: Request,
    role_key: str,
    body: UpdateRoleMetaBody,
    _admin=Depends(require_permission("permission.assign")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoleService(db)
    return ok(request, await svc.update_meta(role_key, body))


@router.get("/permissions")
async def list_permissions(
    request: Request,
    _admin=Depends(require_permission("permission.assign")),
    db: AsyncSession = Depends(get_db),
):
    svc = RoleService(db)
    return ok(request, await svc.list_permissions())
