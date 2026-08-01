"""鉴权 Schema，对齐 apps/admin/src/api/types.ts。"""

from app.schemas.common import CamelModel
from app.schemas.enums import AdminRole, Permission


class LoginCredentials(CamelModel):
    username: str
    password: str
    remember: bool = False


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


class LoginResponse(CamelModel):
    token: str
    user: AdminUserInfo
    expires_at: int
    refresh_token: str | None = None


class RefreshRequest(CamelModel):
    refresh_token: str
