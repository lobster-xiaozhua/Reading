"""系统配置服务测试（读取默认、读取既有、更新）。"""

import pytest

from app.models.system_config import SystemConfigModel
from app.services.system_service import SystemService


@pytest.fixture
def svc(db_session):
    return SystemService(db_session)


class TestGetConfig:
    async def test_get_config_creates_default(self, svc):
        config = await svc.get_config()
        assert config.site_name == "小说阅读平台"
        assert config.version == "2.1.0"

    async def test_get_config_returns_existing(self, svc, db_session):
        db_session.add(SystemConfigModel(site_name="测试站", icp="京ICP备12345678号"))
        await db_session.commit()
        config = await svc.get_config()
        assert config.site_name == "测试站"
        assert config.icp == "京ICP备12345678号"


class TestUpdateConfig:
    async def test_update_both_fields(self, svc):
        config = await svc.update_config("新站名", "京ICP备87654321号")
        assert config.site_name == "新站名"
        assert config.icp == "京ICP备87654321号"

    async def test_update_only_site_name(self, svc, db_session):
        db_session.add(SystemConfigModel(site_name="旧站", icp="京ICP备1号"))
        await db_session.commit()
        config = await svc.update_config("新站", "")
        assert config.site_name == "新站"
        assert config.icp == ""
