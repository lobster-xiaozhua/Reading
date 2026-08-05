"""批量操作工具函数"""

import structlog

from app.core.exceptions import BizError


async def batch_execute(
    ids: list,
    handler,
    *,
    logger_name: str = "batch",
    error_map: dict | None = None,
) -> tuple[int, list[dict]]:
    """批量执行操作，自动收集失败项

    Args:
        ids: 要处理的 ID 列表
        handler: 异步处理函数，接收单个 ID
        logger_name: 日志记录器名称
        error_map: 错误类型到失败原因的映射

    Returns:
        (success_count, failed_list) 其中 failed_list 每项为 {"id": ..., "reason": ...}
    """
    logger = structlog.get_logger(logger_name)
    success_count = 0
    failed: list[dict] = []
    error_map = error_map or {}

    for item_id in ids:
        try:
            await handler(item_id)
            success_count += 1
        except BizError as e:
            reason = error_map.get(type(e), e.message)
            failed.append({"id": item_id, "reason": reason})
        except Exception as e:
            logger.exception("batch_execute error", item_id=item_id)
            failed.append({"id": item_id, "reason": str(e)})

    return success_count, failed
