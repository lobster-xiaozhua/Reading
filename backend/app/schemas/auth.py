"""鉴权 Schema，对齐前端 types。

包含 B 端管理员和 C 端读者两种登录响应。
"""

from app.schemas.common import CamelModel
from app.schemas.enums import AdminRole, Permission


class LoginCredentials(CamelModel):
    username: str
    password: str
    remember: bool = False


class RefreshRequest(CamelModel):
    refresh_token: str


class AdminUserInfo(CamelModel):
    """管理员信息（对齐 AdminUser）。"""

    id: str
    username: str
    nickname: str = ""
    avatar: str = ""
    email: str = ""
    roles: list[AdminRole] = []
    permissions: list[Permission] = []
    last_login_at: int = 0
    enabled: bool = True


class ReaderUserInfo(CamelModel):
    """读者信息（对齐 ReaderUser）。"""

    id: str
    username: str
    nickname: str = ""
    avatar: str = ""


class BLoginResponse(CamelModel):
    token: str
    user: AdminUserInfo
    expires_at: int
    refresh_token: str | None = None


class CLoginResponse(CamelModel):
    token: str
    user: ReaderUserInfo
    expires_at: int
    refresh_token: str | None = None
