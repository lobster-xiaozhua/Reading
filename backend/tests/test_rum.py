"""RUM 上报端点测试。"""


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
