"""事务管理上下文。

统一封装 begin/commit/rollback，避免各 service 直接调用 session.commit()/rollback()。
"""

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger(__name__)


class TransactionError(Exception):
    """事务执行失败。"""


class Transaction:
    """事务上下文管理器。

    用法：
        async with Transaction(session) as tx:
            obj = await session.get(Model, id)
            obj.field = value
            # 成功时自动 commit
        # 退出上下文时如果未发生异常则 commit，否则 rollback
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def __aenter__(self) -> "Transaction":
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> bool:
        if exc_type is None:
            try:
                await self.session.commit()
            except Exception as e:
                logger.exception("Transaction commit failed")
                await self.session.rollback()
                raise TransactionError(str(e)) from e
        else:
            try:
                await self.session.rollback()
            except Exception:
                logger.exception("Transaction rollback failed")
        return False
