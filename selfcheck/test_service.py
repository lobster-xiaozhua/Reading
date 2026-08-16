"""自检服务 HTTP 接口契约测试。"""

from types import SimpleNamespace

import httpx
import pytest
import pytest_asyncio

import service


class FakeRunner:
    def __init__(self):
        self.job = SimpleNamespace(
            job_id="job-1",
            tag="health",
            status="done",
            started_at=1.0,
            finished_at=2.0,
            error="",
            report=None,
        )

    def submit(self, tag, timeout_ms=15000):
        self.job.tag = tag
        return self.job.job_id

    def run(self, job_id, tag):
        self.job.status = "done"

    def get(self, job_id):
        return self.job if job_id == self.job.job_id else None

    def latest(self):
        return None


@pytest_asyncio.fixture
async def client(monkeypatch):
    monkeypatch.setattr(service, "_runner", FakeRunner())
    transport = httpx.ASGITransport(app=service.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_healthz_and_summary_contract(client):
    health = await client.get("/healthz")
    summary = await client.get("/selfcheck/summary")

    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert summary.status_code == 200
    assert summary.json() == {"hasReport": False}


@pytest.mark.asyncio
async def test_run_validates_input_and_returns_job(client):
    response = await client.post(
        "/selfcheck/run",
        json={"tag": "api", "timeout_ms": 1000},
    )

    assert response.status_code == 200
    assert response.json() == {"jobId": "job-1", "tag": "api", "status": "pending"}

    status = await client.get("/selfcheck/status/job-1")
    assert status.status_code == 200
    assert status.json()["status"] == "done"


@pytest.mark.asyncio
async def test_run_rejects_invalid_timeout_and_unknown_job(client):
    invalid_timeout = await client.post(
        "/selfcheck/run",
        json={"tag": "health", "timeout_ms": 100},
    )
    unknown_job = await client.get("/selfcheck/status/missing")

    assert invalid_timeout.status_code == 422
    assert unknown_job.status_code == 404
