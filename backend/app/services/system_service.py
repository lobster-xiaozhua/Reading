"""B 端系统设置服务（§4.2.8）。

提供站点配置查询。
当前为静态配置，后续可接入 system_configs 表。
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.b_end import SystemConfig

logger = logging.getLogger(__name__)


class SystemService:
    """B 端系统设置服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── 系统配置 ─────────────────────────────────────────
    async def get_config(self) -> SystemConfig:
        """获取系统配置。

        当前返回默认配置，后续可从 ``system_configs`` 表读取。
        """
        return SystemConfig(
            site_name="小说阅读平台",
            icp="",
            sensitive_word_lib_version="",
            version="2.1.0",
        )
