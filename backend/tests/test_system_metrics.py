"""统一控制面板系统指标聚合接口测试。"""

import pytest

from app.core import metrics as metric_store
from app.schemas.b_end import SystemMetricsSnapshot

pytestmark = pytest.mark.api


def _snapshot_ints(snap: SystemMetricsSnapshot) -> tuple:
    return (
        snap.http_total,
        snap.http_error_total,
        snap.redis_hits,
        snap.redis_misses,
        snap.slow_query_count,
        len(snap.http_top_paths),
        len(snap.redis_patterns),
        len(snap.redis_command_calls),
        len(snap.redis_slow_commands),
        len(snap.slow_query_top),
    )


class TestSystemMetricsService:
    async def test_empty_snapshot(self, client):
        resp = await client.get("/api/v1/b/workbench/system-metrics")
        assert resp.status_code == 200
        payload = resp.json()
        assert payload["code"] == 0
        snap = SystemMetricsSnapshot.model_validate(payload["data"])
        assert snap.redis_hit_rate >= 0.0 and snap.redis_hit_rate <= 1.0
        assert isinstance(snap.http_top_paths, list)
        assert isinstance(snap.redis_patterns, list)
        assert isinstance(snap.slow_query_top, list)
        assert isinstance(snap.redis_slow_commands, list)
        assert isinstance(snap.redis_command_calls, list)

    async def test_snapshot_reflects_injected_metrics(self, client):
        before_counts, _, before_errors = metric_store.get_metrics()
        before_total = sum(before_counts.values())
        before_error = sum(before_errors.values())
        before_redis = metric_store.get_redis_stats()

        metric_store.inc_metric("/test/a", 30.0, 200)
        metric_store.inc_metric("/test/b", 300.0, 500)
        metric_store.inc_redis(hit=True)
        metric_store.inc_redis(hit=True)
        metric_store.inc_redis(hit=False)
        metric_store.inc_cache_access("novel:{id}", hit=True)
        metric_store.inc_cache_access("novel:{id}", hit=False)
        metric_store.record_redis_call("get")
        metric_store.record_redis_call("get")
        metric_store.record_redis_call("hgetall")
        metric_store.record_slow_redis("hgetall", 35.0)
        metric_store.record_slow_query(120.0, "SELECT * FROM novels WHERE id = ?")

        resp = await client.get("/api/v1/b/workbench/system-metrics")
        assert resp.status_code == 200
        snap = SystemMetricsSnapshot.model_validate(resp.json()["data"])

        # +2 = 注入的 2 条；快照生成时自身请求尚未被 access_log 计数
        assert snap.http_total == before_total + 2
        assert snap.http_error_total == before_error + 1
        assert snap.redis_hits == before_redis["hits"] + 2
        assert snap.redis_misses == before_redis["misses"] + 1
        expected_rate = (before_redis["hits"] + 2) / (
            before_redis["hits"] + before_redis["misses"] + 3
        )
        assert snap.redis_hit_rate == pytest.approx(expected_rate, abs=1e-3)
        pattern = next(
            (p for p in snap.redis_patterns if p.pattern == "novel:{id}"), None
        )
        assert pattern is not None
        assert pattern.hits >= 1
        assert pattern.misses >= 1
        calls = {c.command: c.calls for c in snap.redis_command_calls}
        assert calls.get("get", 0) >= 2
        assert calls.get("hgetall", 0) >= 1
        assert any(c.text == "hgetall" and c.duration_ms == 35.0 for c in snap.redis_slow_commands)
        assert snap.slow_query_count >= 1
        assert any(
            c.text == "SELECT * FROM novels WHERE id = ?" and c.duration_ms == 120.0
            for c in snap.slow_query_top
        )

    async def test_http_top_paths_limited_to_ten(self, client):
        before_total = sum(metric_store.get_metrics()[0].values())
        for i in range(12):
            metric_store.inc_metric(f"/test/top{i}", 10.0, 200)
        resp = await client.get("/api/v1/b/workbench/system-metrics")
        snap = SystemMetricsSnapshot.model_validate(resp.json()["data"])
        assert len(snap.http_top_paths) <= 10
        assert snap.http_total >= before_total + 12
