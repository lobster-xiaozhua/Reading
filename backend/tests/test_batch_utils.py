"""批量执行工具测试（成功、业务异常、通用异常）。"""

from app.core.exceptions import BizError, ErrorCode
from app.utils.batch import batch_execute


async def test_all_success():
    async def ok(item_id):
        assert item_id > 0

    success, failed = await batch_execute([1, 2, 3], ok)
    assert success == 3
    assert failed == []


async def test_empty_ids():
    async def ok(item_id):
        pass

    success, failed = await batch_execute([], ok)
    assert success == 0
    assert failed == []


async def test_biz_error_with_default_message():
    async def fail(item_id):
        raise BizError(ErrorCode.PARAM_INVALID, "原始消息")

    success, failed = await batch_execute([1, 2], fail)
    assert success == 0
    assert len(failed) == 2
    assert failed[0]["reason"] == "原始消息"


async def test_biz_error_mapped_reason():
    async def fail(item_id):
        raise BizError(ErrorCode.PARAM_INVALID, "原始消息")

    success, failed = await batch_execute([1], fail, error_map={BizError: "映射原因"})
    assert success == 0
    assert failed[0]["reason"] == "映射原因"


async def test_generic_exception_collects_str():
    async def boom(item_id):
        raise ValueError("boom")

    success, failed = await batch_execute([1, 2], boom)
    assert success == 0
    assert len(failed) == 2
    assert failed[0]["reason"] == "boom"


async def test_mixed_success_and_failure():
    async def handler(item_id):
        if item_id == 2:
            raise ValueError("skip")
        return None

    success, failed = await batch_execute([1, 2, 3], handler)
    assert success == 2
    assert failed == [{"id": 2, "reason": "skip"}]
