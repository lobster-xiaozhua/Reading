"""上传服务测试（封面图片）。"""

import pytest

from app.core.exceptions import BizError
from app.services import upload_service
from app.services.upload_service import UploadService


class _FakeUpload:
    """最小 UploadFile 替身。"""

    def __init__(self, filename: str, data: bytes):
        self.filename = filename
        self._data = data

    async def read(self) -> bytes:
        return self._data


def _png_bytes() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _jpg_bytes() -> bytes:
    return b"\xff\xd8\xff\xe0" + b"\x00" * 64


@pytest.fixture
def svc(tmp_path, monkeypatch):
    monkeypatch.setattr(upload_service, "COVER_DIR", tmp_path / "covers")
    return UploadService()


class TestUploadService:
    async def test_save_jpg(self, svc):
        result = await svc.save_image(_FakeUpload("cover.jpg", _jpg_bytes()))
        assert result["url"].startswith("/uploads/covers/")
        assert result["url"].endswith(".jpg")
        assert result["name"] == "cover.jpg"
        assert result["size"] > 0

    async def test_save_png(self, svc):
        result = await svc.save_image(_FakeUpload("封面.png", _png_bytes()))
        assert result["url"].endswith(".png")

    async def test_reject_non_image_by_magic(self, svc):
        """伪装 .jpg 扩展名的文本文件应被拒绝（按文件头检测）。"""
        with pytest.raises(BizError):
            await svc.save_image(_FakeUpload("fake.jpg", b"this is not an image"))

    async def test_reject_empty_file(self, svc):
        with pytest.raises(BizError):
            await svc.save_image(_FakeUpload("empty.png", b""))

    async def test_reject_oversize(self, svc):
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (upload_service.MAX_IMAGE_BYTES + 1)
        with pytest.raises(BizError):
            await svc.save_image(_FakeUpload("big.png", big))

    async def test_missing_file(self, svc):
        with pytest.raises(BizError):
            await svc.save_image(None)

    async def test_filename_is_server_generated(self, svc):
        """保存文件名由服务端 UUID 生成，不包含用户文件名。"""
        result = await svc.save_image(_FakeUpload("../../etc/passwd.png", _png_bytes()))
        assert "../" not in result["url"]
        assert "passwd" not in result["url"]
