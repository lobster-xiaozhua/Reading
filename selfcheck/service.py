#!/usr/bin/env python3
"""真实流量自检服务（常驻，端口 8090）。

提供存活/就绪探针与按需触发的全量自检：
  GET  /healthz            存活探针（进程级）
  GET  /readyz             就绪探针（后端/C端/B端/OpenAPI 依赖探测）
  POST /selfcheck/run      后台触发自检，body: {tag, timeout_ms}
  GET  /selfcheck/status/{job_id}   查询任务状态
  GET  /selfcheck/latest   最近一次自检报告
  GET  /selfcheck/summary  自检通过率摘要

启动: python3 selfcheck/service.py --port 8090
"""

from __future__ import annotations

import argparse
import sys
import threading
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "selfcheck") not in sys.path:
    sys.path.insert(0, str(ROOT / "selfcheck"))

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from runner import SelfCheckRunner

app = FastAPI(title="真实流量自检服务", version="1.0.0")
_runner = SelfCheckRunner()


class RunRequest(BaseModel):
    tag: str = Field("all", description="all|health|fast|api|pages")
    timeout_ms: int = Field(15000, ge=500, le=60000)


def _healthz_probe() -> dict[str, Any]:
    """就绪探测：检查后端/前端/OpenAPI 依赖。"""
    probe = _runner.run_sync("health")
    results = {r["name"]: r for r in probe["results"]}
    failures = [r for r in probe["results"] if r["status"] == "fail"]
    return {
        "ok": len(failures) == 0,
        "dependencies": results,
        "failedCount": len(failures),
    }


@app.get("/healthz")
async def healthz() -> dict[str, Any]:
    """存活探针。"""
    return {"status": "ok", "service": "selfcheck", "ts": _now_ms()}


@app.get("/readyz")
async def readyz() -> JSONResponse:
    """就绪探针：依赖全部可用返回 200，否则 503。"""
    state = _healthz_probe()
    code = 200 if state["ok"] else 503
    return JSONResponse(status_code=code, content=state)


@app.post("/selfcheck/run")
async def selfcheck_run(req: RunRequest) -> dict[str, Any]:
    """后台触发一次全量自检，返回 job_id。"""
    job_id = _runner.submit(req.tag)
    threading.Thread(target=_runner.run, args=(job_id, req.tag), daemon=True).start()
    return {"jobId": job_id, "tag": req.tag, "status": "pending"}


@app.get("/selfcheck/status/{job_id}")
async def selfcheck_status(job_id: str) -> dict[str, Any]:
    job = _runner.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"任务不存在: {job_id}")
    return {
        "jobId": job.job_id,
        "tag": job.tag,
        "status": job.status,
        "startedAt": job.started_at,
        "finishedAt": job.finished_at,
        "error": job.error,
    }


@app.get("/selfcheck/latest")
async def selfcheck_latest() -> dict[str, Any]:
    job = _runner.latest()
    if job is None or not job.report:
        raise HTTPException(status_code=404, detail="尚无自检记录")
    return {
        "jobId": job.job_id,
        "tag": job.tag,
        "status": job.status,
        "report": job.report,
    }


@app.get("/selfcheck/summary")
async def selfcheck_summary() -> dict[str, Any]:
    job = _runner.latest()
    if job is None:
        return {"hasReport": False}
    s = job.report.get("summary", {})
    return {
        "hasReport": True,
        "jobId": job.job_id,
        "status": job.status,
        "summary": s,
    }


def _now_ms() -> int:
    import time as _t

    return int(_t.time() * 1000)


def main() -> None:
    import uvicorn

    parser = argparse.ArgumentParser(description="真实流量自检服务")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()
    print(f"[selfcheck] 服务启动 http://{args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
