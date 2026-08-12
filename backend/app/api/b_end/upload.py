"""B 端文件上传路由。

提供封面图等静态资源的上传能力（multipart/form-data），
文件保存在 backend/uploads/，由 /uploads 静态路由托管。
"""

from fastapi import APIRouter, Depends, File, Request, UploadFile

from app.api.deps import ok, require_permission
from app.services.upload_service import UploadService

router = APIRouter()


@router.post("/uploads/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    _admin=Depends(require_permission("novel.edit")),
):
    """上传封面图片（JPG/PNG/WEBP/GIF，≤2MB）。"""
    svc = UploadService()
    return ok(request, await svc.save_image(file))
