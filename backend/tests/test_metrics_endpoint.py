"""可观测性 /metrics 端点测试（HTTP 指标、Redis 命中率、慢查询统计）。"""

import pytest

pytestmark = pytest.mark.api


class TestMetricsEndpoint:
    async def test_metrics_returns_http_and_observability_metrics(self, client):
        resp = await client.get("/metrics")
        assert resp.status_code == 200
        text = resp.text
        assert "# HELP http_requests_total" in text
        assert "# HELP http_request_duration_ms" in text
        assert "# HELP http_request_errors_total" in text
        assert "redis_cache_hits_total" in text
        assert "redis_cache_misses_total" in text
        assert "redis_cache_hit_rate" in text
        assert "redis_cache_pattern_hits_total" in text
        assert "redis_cache_pattern_misses_total" in text
        assert "db_slow_queries_total" in text
        assert "db_slow_query_avg_ms" in text
        assert "db_slow_query_top_ms" in text
        assert "redis_command_calls_total" in text
        assert "redis_slow_command_calls_total" in text
