"""状态机单元测试（§9.1 / §9.2 / §9.4）。"""

import pytest

from app.core.exceptions import BizError
from app.utils.state_machine import (
    ChapterStateMachine,
    NovelStateMachine,
    RoyaltyStateMachine,
)


class TestNovelStateMachine:
    def test_draft_to_pending(self):
        assert NovelStateMachine.can_transition("draft", "pending")

    def test_pending_to_published(self):
        assert NovelStateMachine.can_transition("pending", "published")

    def test_pending_to_draft_reject(self):
        assert NovelStateMachine.can_transition("pending", "draft")

    def test_published_to_offline(self):
        assert NovelStateMachine.can_transition("published", "offline")

    def test_offline_to_published_reshelve(self):
        assert NovelStateMachine.can_transition("offline", "published")

    def test_invalid_draft_to_published(self):
        assert not NovelStateMachine.can_transition("draft", "published")

    def test_invalid_published_to_draft(self):
        assert not NovelStateMachine.can_transition("published", "draft")

    def test_assert_transition_raises_on_invalid(self):
        with pytest.raises(BizError) as exc_info:
            NovelStateMachine.assert_transition("draft", "published")
        assert "非法状态转换" in exc_info.value.message


class TestChapterStateMachine:
    def test_draft_to_pending(self):
        assert ChapterStateMachine.can_transition("draft", "pending")

    def test_pending_to_published(self):
        assert ChapterStateMachine.can_transition("pending", "published")

    def test_published_to_offline(self):
        assert ChapterStateMachine.can_transition("published", "offline")


class TestRoyaltyStateMachine:
    def test_pending_to_settled(self):
        assert RoyaltyStateMachine.can_transition("pending", "settled")

    def test_settled_to_withdrawn(self):
        assert RoyaltyStateMachine.can_transition("settled", "withdrawn")

    def test_withdrawn_terminal(self):
        assert not RoyaltyStateMachine.can_transition("withdrawn", "settled")
        assert not RoyaltyStateMachine.can_transition("withdrawn", "pending")
