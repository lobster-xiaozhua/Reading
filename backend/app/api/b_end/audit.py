"""B 端内容审核路由（§8.5）。

对应前端 fetchAuditQueue / fetchAuditHistory / submitAudit。
"""

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ok, require_permission
from app.core.database import get_db
from app.schemas.b_end import AuditSubmitBody
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audits")


@router.get("/queue")
async def get_audit_queue(
    request: Request,
    level: str = Query("all"),
    _admin=Depends(require_permission("audit.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = AuditService(db)
    return ok(request, await svc.get_queue(level))


@router.get("/{item_id}/history")
async def get_audit_history(
    request: Request,
    item_id: str,
    _admin=Depends(require_permission("audit.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = AuditService(db)
    return ok(request, await svc.get_history(int(item_id)))


@router.get("/{item_id}/content")
async def get_audit_content(
    request: Request,
    item_id: str,
    _admin=Depends(require_permission("audit.list")),
    db: AsyncSession = Depends(get_db),
):
    svc = AuditService(db)
    return ok(request, await svc.get_content(int(item_id)))


@router.post("/submit")
async def submit_audit(
    request: Request,
    body: AuditSubmitBody,
    admin=Depends(require_permission("audit.approve")),
    db: AsyncSession = Depends(get_db),
):
    svc = AuditService(db)
    return ok(
        request,
        await svc.submit_audit(body, admin.id, admin.nickname or admin.username),
    )
