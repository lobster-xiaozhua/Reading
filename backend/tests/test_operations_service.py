"""运行观测服务测试。"""

import pytest

from app.services.operations_service import OperationsService

pytestmark = pytest.mark.service


class TestOperationsService:
    async def test_unavailable_selfcheck_returns_safe_snapshot(self):
        service = OperationsService(base_url="http://127.0.0.1:1", timeout=0.01)

        snapshot = await service.get_snapshot()

        assert snapshot.service_status == "unavailable"
        assert snapshot.ready is False
        assert snapshot.has_report is False


class TestOperationsApi:
    async def test_operations_snapshot_uses_standard_response(self, client):
        response = await client.get("/api/v1/b/workbench/operations")

        assert response.status_code == 200
        payload = response.json()
        assert payload["code"] == 0
        assert payload["data"]["serviceStatus"] in {"ready", "degraded", "unavailable"}

    async def test_operations_rejects_unknown_check_tag(self, client):
        response = await client.post(
            "/api/v1/b/workbench/operations/run",
            json={"tag": "unknown", "timeoutMs": 1000},
        )

        assert response.status_code == 422
