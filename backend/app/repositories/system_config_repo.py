from sqlalchemy import select

from app.models.system_config import SystemConfigModel
from app.repositories.base import BaseRepository


class SystemConfigRepository(BaseRepository[SystemConfigModel]):
    model = SystemConfigModel

    async def get_or_create(self) -> SystemConfigModel:
        """获取系统配置，不存在则创建默认配置。"""
        result = await self.session.execute(select(SystemConfigModel).limit(1))
        config = result.scalar_one_or_none()
        if not config:
            config = SystemConfigModel()
            self.session.add(config)
            await self.session.flush()
        return config

    async def update_config(self, site_name: str, icp: str) -> SystemConfigModel:
        """更新站点名称和 ICP 备案号。"""
        config = await self.get_or_create()
        if site_name:
            config.site_name = site_name
        if icp is not None:
            config.icp = icp
        await self.session.flush()
        return config
