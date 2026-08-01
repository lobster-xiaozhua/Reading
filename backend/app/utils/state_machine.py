"""状态机：作品 / 章节状态转换校验（§9.1 / §9.2）。"""

from typing import ClassVar

from app.core.exceptions import BizError, ErrorCode


class StateMachine:
    """状态机基类。子类通过 ``TRANSITIONS`` 声明合法转换。"""

    TRANSITIONS: ClassVar[dict[str, set[str]]] = {}

    @classmethod
    def can_transition(cls, current: str, target: str) -> bool:
        return target in cls.TRANSITIONS.get(current, set())

    @classmethod
    def assert_transition(cls, current: str, target: str) -> None:
        if not cls.can_transition(current, target):
            raise BizError(
                ErrorCode.NOVEL_STATUS_INVALID,
                f"非法状态转换: {current} -> {target}",
            )


class NovelStateMachine(StateMachine):
    """作品状态机（§9.1）。

    draft → pending → published → offline → published
    pending → draft（驳回回退）
    """

    TRANSITIONS: ClassVar[dict[str, set[str]]] = {
        "draft": {"pending"},
        "pending": {"published", "draft"},
        "published": {"offline"},
        "offline": {"published"},
    }


class ChapterStateMachine(StateMachine):
    """章节状态机（§9.2）。"""

    TRANSITIONS: ClassVar[dict[str, set[str]]] = {
        "draft": {"pending"},
        "pending": {"published", "draft"},
        "published": {"offline"},
        "offline": {"published"},
    }


# 稿费结算状态机（§9.4）
class RoyaltyStateMachine(StateMachine):
    TRANSITIONS: ClassVar[dict[str, set[str]]] = {
        "pending": {"settled"},
        "settled": {"withdrawn"},
        "withdrawn": set(),
    }
