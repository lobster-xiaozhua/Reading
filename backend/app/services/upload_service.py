"""静态资源上传服务（封面图片等）。

安全约定：
- 仅接受图片，且按文件头（magic bytes）检测真实格式，不信任 content_type/扩展名
- 保存文件名由服务端 UUID 生成，杜绝路径穿越
- 限制单文件大小
"""

from pathlib import Path
from uuid import uuid4

from app.core.exceptions import BizError, ErrorCode

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
COVER_DIR = UPLOAD_ROOT / "covers"

MAX_IMAGE_BYTES = 2 * 1024 * 1024


def _detect_image_ext(raw: bytes) -> str | None:
    """按文件头检测图片格式，返回扩展名（jpg/png/webp/gif），无法识别返回 None。"""
    if raw.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if raw[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return "webp"
    return None


class UploadService:
    """静态资源上传。"""

    async def save_image(self, file) -> dict:
        """校验并保存图片，返回可访问的 URL。

        Args:
            file: UploadFile。

        Returns:
            {"url": str, "name": str, "size": int}

        Raises:
            BizError: 文件缺失/空/超限/非图片。
        """
        if not file or not getattr(file, "filename", None):
            raise BizError(ErrorCode.PARAM_INVALID, "未获取到上传文件")
        raw = await file.read()
        if not raw:
            raise BizError(ErrorCode.PARAM_INVALID, "上传文件为空")
        if len(raw) > MAX_IMAGE_BYTES:
            raise BizError(ErrorCode.PARAM_INVALID, "图片大小超过 2MB 限制")
        ext = _detect_image_ext(raw)
        if ext is None:
            raise BizError(
                ErrorCode.PARAM_INVALID, "仅支持 JPG / PNG / WEBP / GIF 图片",
            )
        COVER_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.{ext}"
        (COVER_DIR / filename).write_bytes(raw)
        return {
            "url": f"/uploads/covers/{filename}",
            "name": file.filename,
            "size": len(raw),
        }
