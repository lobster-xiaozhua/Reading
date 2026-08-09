"""Schema 契约测试：验证所有 CamelModel 序列化别名均为 camelCase。

对齐前端 TS camelCase 命名契约（§5.1），新增字段若未走 alias_generator
或显式别名含下划线，会被此测试拦截，避免前后端字段名不一致。
"""

import importlib
import pkgutil

import pytest
from pydantic.alias_generators import to_camel

from app.schemas.common import CamelModel

pytestmark = pytest.mark.unit


def _iter_camel_models():
    """遍历 app.schemas 下全部模块，收集所有 CamelModel 子类。"""
    from app import schemas as schemas_pkg

    seen = set()
    for mod_info in pkgutil.walk_packages(
        schemas_pkg.__path__, schemas_pkg.__name__ + "."
    ):
        try:
            module = importlib.import_module(mod_info.name)
        except Exception:
            continue
        for obj in vars(module).values():
            if (
                isinstance(obj, type)
                and issubclass(obj, CamelModel)
                and obj is not CamelModel
                and obj not in seen
            ):
                seen.add(obj)
                yield obj


def test_schemas_discovered():
    """至少发现一批 CamelModel，确保遍历逻辑有效而非空跑。"""
    models = list(_iter_camel_models())
    assert len(models) >= 20


def test_all_camel_models_serialize_camel_case():
    """所有 CamelModel 字段的序列化别名不得包含下划线。"""
    models = list(_iter_camel_models())
    for model in models:
        for field_name, info in model.model_fields.items():
            alias = info.alias
            if alias is None:
                alias = to_camel(field_name)
            assert "_" not in alias, (
                f"{model.__name__}.{field_name} 序列化别名 '{alias}' 含下划线，"
                f"将导致前端 camelCase 契约破坏"
            )


def test_response_contract_fields():
    """统一响应体契约字段：code/message/data/traceId。"""
    from app.schemas.common import Response

    fields = set(Response.model_fields)
    assert {"code", "message", "data", "traceId"} <= fields
    # 序列化别名不得含下划线
    for name in fields:
        alias = Response.model_fields[name].alias or to_camel(name)
        assert "_" not in alias
