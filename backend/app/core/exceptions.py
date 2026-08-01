"""业务异常体系（§5.3 业务错误码）。"""

from enum import IntEnum


class ErrorCode(IntEnum):
    """业务错误码区间定义。"""

    # 通用成功
    OK = 0

    # 1xxxx 鉴权
    UNAUTHORIZED = 10001
    TOKEN_EXPIRED = 10002
    ACCOUNT_LOCKED = 10003
    INVALID_CREDENTIALS = 10004

    # 2xxxx 作品
    NOVEL_NOT_FOUND = 20001
    NOVEL_STATUS_INVALID = 20002

    # 3xxxx 章节
    CHAPTER_NOT_FOUND = 30001
    CHAPTER_TITLE_MISMATCH = 30002
    VIP_CHAPTER_LOCKED = 30003

    # 4xxxx 审核
    AUDIT_NOT_FOUND = 40001
    AUDIT_RESULT_INVALID = 40002

    # 5xxxx 权限
    FORBIDDEN = 50001
    ROLE_NOT_EDITABLE = 50002

    # 6xxxx 稿费
    ROYALTY_ALREADY_SETTLED = 60001
    INSUFFICIENT_BALANCE = 60002

    # 7xxxx 系统
    FILE_UPLOAD_FAILED = 70001
    SENSITIVE_VERSION_CONFLICT = 70002

    # 8xxxx 限流
    RATE_LIMITED = 80001

    # 9xxxx 通用
    PARAM_INVALID = 90001
    RESOURCE_NOT_FOUND = 90002
    INTERNAL_ERROR = 99999


class BizError(Exception):
    """业务异常基类，携带业务错误码与可读消息。

    HTTP 状态码默认 200（业务错误走 code 区分，§5.2 铁律），
    鉴权类异常可覆写为 401/403/429。

    用法：
        BizError(ErrorCode.PARAM_INVALID, "msg")   # 显式 code + 消息
        BizError("msg")                             # 仅消息（沿用子类默认 code）
    """

    code: int = ErrorCode.INTERNAL_ERROR
    http_status: int = 200
    message: str = "服务异常"

    def __init__(self, code: int | str | None = None, message: str | None = None):
        # 兼容 BizError("msg") 写法：第一个参数为字符串时视为消息
        if isinstance(code, str):
            message = code
            code = None
        if code is not None:
            self.code = int(code)
        if message is not None:
            self.message = message
        super().__init__(self.message)


class UnauthorizedError(BizError):
    code = ErrorCode.UNAUTHORIZED
    http_status = 401
    message = "未登录或登录已过期"


class ForbiddenError(BizError):
    code = ErrorCode.FORBIDDEN
    http_status = 403
    message = "无权限访问"


class NotFoundError(BizError):
    code = ErrorCode.RESOURCE_NOT_FOUND
    http_status = 200
    message = "资源不存在"


class ParamError(BizError):
    code = ErrorCode.PARAM_INVALID
    http_status = 200
    message = "参数校验失败"


class RateLimitedError(BizError):
    code = ErrorCode.RATE_LIMITED
    http_status = 429
    message = "请求过于频繁，请稍后再试"
