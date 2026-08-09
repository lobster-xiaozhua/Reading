"""Property-based tests for scoring algorithms.

使用 hypothesis 验证核心算法的不变量。
默认运行，可通过 pytest -m "not slow" 跳过（快速模式）。
"""

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.models.novel import Novel
from app.services.recommend_service import _cf_score, _cold_score, time_decay_weight

pytestmark = pytest.mark.unit


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=1000), st.integers(min_value=0, max_value=1000))
def test_cf_score_is_bounded(cnt: int, total: int) -> None:
    """协同过滤匹配度始终在 [60, 100] 区间内。"""
    result = _cf_score(cnt, total)
    assert 60 <= result <= 100


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=1000), st.integers(min_value=1, max_value=1000))
def test_cf_score_monotonic(cnt: int, total: int) -> None:
    """共现频次越高，匹配度不低于较低值（单调不减）。"""
    higher_cnt = cnt + 1
    assert _cf_score(higher_cnt, total) >= _cf_score(cnt, total)


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=100))
def test_cf_score_zero_total_returns_floor(total: int) -> None:
    """总候选为零时返回下限 60。"""
    assert _cf_score(0, total) == 60 if total == 0 else True


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=1000))
def test_cf_score_full_match_is_100(cnt: int) -> None:
    """共现次数等于总数时返回 100。"""
    if cnt > 0:
        assert _cf_score(cnt, cnt) == 100


def test_cf_score_exact_boundary() -> None:
    """cnt=0, total>0 时返回下限 60。"""
    assert _cf_score(0, 1) == 60


@pytest.mark.slow
@given(st.floats(min_value=0.0, max_value=5.0, allow_nan=False, allow_infinity=False))
def test_cold_score_bounded(rating: float) -> None:
    """冷启动匹配度始终在 [0, 100] 区间内。"""
    novel = Novel(
        title="test", author_name="a", category="xuanhuan",
        status="published", word_count=100, click_count=0, rating=rating,
    )
    result = _cold_score(novel)
    assert 0 <= result <= 100


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=100000))
def test_cold_score_click_boost(click_count: int) -> None:
    """点击量超过 10000 时匹配度至少比不足时高（加成验证）。"""
    low_click = Novel(
        title="test", author_name="a", category="xuanhuan",
        status="published", word_count=100, click_count=min(click_count, 9999), rating=5.0,
    )
    high_click = Novel(
        title="test", author_name="a", category="xuanhuan",
        status="published", word_count=100, click_count=max(click_count, 10000), rating=5.0,
    )
    assert _cold_score(high_click) >= _cold_score(low_click)


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=500000))
def test_time_decay_weight_bounds(ms_ago: int) -> None:
    """时间衰减权重始终在 [0.5, 2.0] 区间内。"""
    now_ms = 1000000000000
    result = time_decay_weight(now_ms - ms_ago, now_ms)
    assert 0.5 <= result <= 2.0


@pytest.mark.slow
@given(st.integers(min_value=0, max_value=1000000), st.integers(min_value=0, max_value=1000000))
def test_time_decay_monotonic(ms_ago_a: int, ms_ago_b: int) -> None:
    """时间越久远，权重越低（单调递减）。"""
    now_ms = 1000000000000
    older = now_ms - max(ms_ago_a, ms_ago_b)
    recent = now_ms - min(ms_ago_a, ms_ago_b)
    assert time_decay_weight(older, now_ms) <= time_decay_weight(recent, now_ms)


def test_time_decay_exact_zero_age() -> None:
    """刚刚阅读（age=0）返回最大权重 2.0。"""
    now_ms = 1000000000000
    assert time_decay_weight(now_ms, now_ms) == 2.0


def test_time_decay_long_ago_floor() -> None:
    """超过 30 天前的阅读权重趋近下限 0.5。"""
    now_ms = 1000000000000
    thirty_days_ago = now_ms - 30 * 24 * 60 * 60 * 1000
    result = time_decay_weight(thirty_days_ago, now_ms)
    assert 0.8 <= result <= 0.9  # 30天：2.0 - (30-7)*0.05 = 0.85
