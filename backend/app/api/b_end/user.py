"""B 端用户管理路由。

对应前端 user.getList。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.services.user_service import UserService

router = APIRouter(prefix="/users")


@router.get("")
async def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search_key: str = Query(""),
    _admin=Depends(require_permission("user.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    return ok(request, await svc.list_users(page, page_size, search_key))


@router.post("/{reader_id}/status")
async def set_user_status(
    request: Request,
    reader_id: int,
    status: int = Query(..., description="0 封禁 1 正常"),
    _admin=Depends(require_permission("user.edit")),
    db: AsyncSession = Depends(get_db),
):
    svc = UserService(db)
    result = await svc.set_status(reader_id, status)
    if not result:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("用户不存在")
    return ok(request, True)
