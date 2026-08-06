"""RUM 上报端点测试：校验、落库、B 端统计/查询闭环。"""


class TestRumIngest:
    async def test_perf_event(self, client):
        resp = await client.post(
            "/api/v1/c/rum",
            json={"type": "perf", "name": "LCP", "value": 1200.5, "rating": "good"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["code"] == 0
        assert body["data"] is None

    async def test_error_event_with_meta(self, client):
        resp = await client.post(
            "/api/v1/c/rum",
            json={
                "type": "error",
                "name": "TypeError",
                "message": "Cannot read properties of undefined",
                "meta": {"path": "/api/v1/c/books/1", "method": "GET", "status": 500},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["code"] == 0

    async def test_missing_name_rejected(self, client):
        resp = await client.post("/api/v1/c/rum", json={"type": "perf"})
        assert resp.status_code == 422

    async def test_invalid_type_rejected(self, client):
        resp = await client.post("/api/v1/c/rum", json={"type": "unknown", "name": "x"})
        assert resp.status_code == 422

    async def test_empty_body_rejected(self, client):
        resp = await client.post("/api/v1/c/rum", json={})
        assert resp.status_code == 422


class TestRumPersistence:
    async def test_perf_event_persisted_and_queryable(self, client):
        await client.post(
            "/api/v1/c/rum",
            json={"type": "perf", "name": "LCP", "value": 800.0, "rating": "good"},
        )
        stats = (await client.get("/api/v1/b/rum/stats")).json()
        assert stats["code"] == 0
        assert stats["data"]["total"] >= 1
        assert stats["data"]["byType"]["perf"] >= 1

    async def test_error_event_counts(self, client):
        await client.post(
            "/api/v1/c/rum",
            json={"type": "error", "name": "RangeError", "message": "too big"},
        )
        stats = (await client.get("/api/v1/b/rum/stats")).json()
        assert stats["data"]["errorCount"] >= 1

    async def test_list_events_returns_latest_first(self, client):
        await client.post(
            "/api/v1/c/rum",
            json={"type": "perf", "name": "INP", "value": 220.0},
        )
        page = (await client.get("/api/v1/b/rum/events?type=perf")).json()
        assert page["code"] == 0
        assert page["data"]["items"]
        assert page["data"]["items"][0]["name"] == "INP"

    async def test_list_events_pagination(self, client):
        page = (await client.get("/api/v1/b/rum/events?page=1&pageSize=5")).json()
        assert page["data"]["page"] == 1
        assert page["data"]["pageSize"] == 5
