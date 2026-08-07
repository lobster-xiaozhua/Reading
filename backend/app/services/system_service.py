import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.repositories.system_config_repo import SystemConfigRepository
from app.schemas.b_end import SystemConfig

logger = structlog.get_logger(__name__)


class SystemService:
    """B 端系统设置服务（§4.2.8）。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = SystemConfigRepository(session)

    async def get_config(self) -> SystemConfig:
        """获取系统配置。"""
        config = await self.repo.get_or_create()
        return SystemConfig(
            site_name=config.site_name,
            icp=config.icp,
            sensitive_word_lib_version="",
            version=__version__,
        )

    async def update_config(self, site_name: str, icp: str) -> SystemConfig:
        """更新系统配置（站点名称、ICP 备案号）。

        Args:
            site_name: 站点名称。
            icp: ICP 备案号。

        Returns:
            更新后的系统配置。
        """
        config = await self.repo.update_config(site_name, icp)
        await self.session.commit()
        return SystemConfig(
            site_name=config.site_name,
            icp=config.icp,
            sensitive_word_lib_version="",
            version=__version__,
        )
