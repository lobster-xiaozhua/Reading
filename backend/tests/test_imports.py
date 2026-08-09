"""导入完整性测试：确保所有模块可正常导入。"""

import importlib

import pytest

pytestmark = pytest.mark.unit


MODULES = [
    "app.main",
    "app.core.config",
    "app.core.database",
    "app.core.exceptions",
    "app.core.redis",
    "app.core.security",
    "app.models",
    "app.models.audit",
    "app.models.interaction",
    "app.models.novel",
    "app.models.permission",
    "app.models.reading",
    "app.models.royalty",
    "app.models.user",
    "app.schemas.auth",
    "app.schemas.b_end",
    "app.schemas.c_end",
    "app.schemas.chart",
    "app.schemas.common",
    "app.schemas.enums",
    "app.schemas.royalty",
    "app.repositories",
    "app.repositories.audit_repo",
    "app.repositories.chapter_repo",
    "app.repositories.interaction_repo",
    "app.repositories.novel_repo",
    "app.repositories.reader_repo",
    "app.repositories.role_repo",
    "app.repositories.royalty_repo",
    "app.services",
    "app.services.audit_service",
    "app.services.auth_service",
    "app.services.book_service",
    "app.services.chapter_service",
    "app.services.chart_service",
    "app.services.discovery_service",
    "app.services.interaction_service",
    "app.services.novel_service",
    "app.services.role_service",
    "app.services.royalty_service",
    "app.services.search_service",
    "app.services.sensitive_service",
    "app.services.system_service",
    "app.services.user_center_service",
    "app.services.user_service",
    "app.services.workbench_service",
    "app.api.deps",
    "app.api.c_end",
    "app.api.c_end.book",
    "app.api.c_end.discovery",
    "app.api.c_end.interaction",
    "app.api.c_end.search",
    "app.api.c_end.user_center",
    "app.api.b_end",
    "app.api.b_end.audit",
    "app.api.b_end.auth",
    "app.api.b_end.chapter",
    "app.api.b_end.chart",
    "app.api.b_end.novel",
    "app.api.b_end.role",
    "app.api.b_end.royalty",
    "app.api.b_end.sensitive",
    "app.api.b_end.system",
    "app.api.b_end.user",
    "app.api.b_end.workbench",
    "app.utils.sensitive_trie",
    "app.utils.state_machine",
]


@pytest.mark.parametrize("module_name", MODULES)
def test_import(module_name: str):
    """每个模块可无错误导入。"""
    importlib.import_module(module_name)


def test_app_routes_registered():
    """应用注册了足够数量的路由（通过 OpenAPI schema 验证，兼容懒加载路由）。"""
    from app.main import app

    schema = app.openapi()
    paths = set(schema.get("paths", {}).keys())
    assert len(paths) > 50, f"路由数量不足: {len(paths)}"
    # 抽检核心路由
    assert "/api/v1/c/banners" in paths
    assert "/api/v1/c/books/{book_id}" in paths
    assert "/api/v1/b/auth/login" in paths
    assert "/api/v1/b/novels" in paths
    assert "/api/v1/b/audits/queue" in paths
