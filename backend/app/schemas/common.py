"""通用 Schema：统一响应体、分页结果（对齐前端契约 §5.1）。"""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """字段 snake_case → JSON camelCase 自动转换基类。

    对齐前端 TypeScript camelCase 命名约定，schema 内部用 Python 风格，
    序列化输出时统一转 camelCase。
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="ignore",
    )


class Response(CamelModel, Generic[T]):
    """统一响应体：{ code, message, data, traceId }"""

    code: int = Field(default=0, description="0 成功；非 0 业务错误码")
    message: str = Field(default="ok")
    data: T | None = None
    traceId: str | None = Field(default=None, description="链路追踪 ID")

    @classmethod
    def ok(cls, data: Any = None) -> "Response[Any]":
        return cls(code=0, message="ok", data=data)

    @classmethod
    def error(cls, code: int, message: str, data: Any = None) -> "Response[Any]":
        return cls(code=code, message=message, data=data)


class PagedResult(CamelModel, Generic[T]):
    """分页结果（对齐前端 PagedResult<T>）。"""

    items: list[T] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    pageSize: int = 20
    hasMore: bool = False

    @classmethod
    def build(cls, items: list[T], total: int, page: int, page_size: int) -> "PagedResult[T]":
        return cls(
            items=items,
            total=total,
            page=page,
            pageSize=page_size,
            hasMore=page * page_size < total,
        )


class BatchOperateResult(CamelModel):
    """批量操作结果。"""

    success: bool = True
    affected: int = 0
    failed: list[dict] | None = None
