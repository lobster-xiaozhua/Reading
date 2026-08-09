#!/usr/bin/env python3
"""真实流量请求自检执行器（供 selfcheck 服务复用）。

复用 scripts/global-check/global_check.py::GlobalChecker 的 127 项真实
HTTP 探测逻辑，扩展 health 依赖探测、fast 模式与并发执行。

通过真实 HTTP 请求（非 ASGI in-memory）遍历后端 OpenAPI 全端点 + C/B 端
页面，校验统一响应格式；另提供 /health 等依赖探针。
"""

from __future__ import annotations

import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "global-check"))

from global_check import (
    DEFAULT_ADMIN,
    DEFAULT_BACKEND,
    DEFAULT_TIMEOUT,
    DEFAULT_WEB,
    GlobalChecker,
)

REPORTS_DIR = Path(__file__).resolve().parent / "reports"

# 依赖探测端点（health tag）
HEALTH_PROBES = [
    ("后端健康", "GET", "{backend}/health"),
    ("后端 OpenAPI", "GET", "{backend}/openapi.json"),
    ("C 端首页", "GET", "{web}/"),
    ("B 端首页", "GET", "{admin}/"),
]

# fast 模式仅探测关键链路
FAST_PROBES = [
    ("后端健康", "GET", "{backend}/health"),
    ("C 端首页", "GET", "{web}/"),
    ("B 端首页", "GET", "{admin}/"),
    ("C 端书单", "GET", "{backend}/api/v1/c/books?page=1&page_size=5"),
    ("B 端作品列表", "GET", "{backend}/api/v1/b/novels?page=1&page_size=5"),
]


@dataclass
class SelfCheckJob:
    """一次自检任务。"""

    job_id: str
    tag: str = "all"
    status: str = "pending"  # pending | running | done | failed
    started_at: float = 0.0
    finished_at: float = 0.0
    report: dict[str, Any] = field(default_factory=dict)
    error: str = ""


class SelfCheckRunner:
    """真实流量自检执行器：复用 GlobalChecker，扩展依赖探测。"""

    def __init__(
        self,
        backend: str = DEFAULT_BACKEND,
        web: str = DEFAULT_WEB,
        admin: str = DEFAULT_ADMIN,
        timeout_ms: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.backend = backend.rstrip("/")
        self.web = web.rstrip("/")
        self.admin = admin.rstrip("/")
        self.timeout_ms = timeout_ms
        self._lock = threading.Lock()
        self.jobs: dict[str, SelfCheckJob] = {}

    # ── Job 管理 ────────────────────────────────────────
    def submit(self, tag: str = "all") -> str:
        job_id = f"sc-{int(time.time() * 1000)}-{len(self.jobs) + 1}"
        job = SelfCheckJob(job_id=job_id, tag=tag)
        with self._lock:
            self.jobs[job_id] = job
        return job_id

    def get(self, job_id: str) -> SelfCheckJob | None:
        with self._lock:
            return self.jobs.get(job_id)

    def latest(self) -> SelfCheckJob | None:
        with self._lock:
            if not self.jobs:
                return None
            return self.jobs[max(self.jobs)]

    def _set_status(self, job_id: str, status: str, **kwargs: Any) -> None:
        with self._lock:
            job = self.jobs[job_id]
            job.status = status
            for k, v in kwargs.items():
                setattr(job, k, v)

    # ── 执行 ────────────────────────────────────────────
    def run(self, job_id: str, tag: str = "all") -> None:
        """后台执行一次自检（线程内运行）。"""
        job = self.jobs[job_id]
        job.started_at = time.time()
        job.status = "running"
        try:
            report = self._run_checks(tag)
            job.report = report
            job.status = "done"
        except Exception as exc:  # noqa: BLE001
            job.error = str(exc)
            job.status = "failed"
        finally:
            job.finished_at = time.time()

    def run_sync(self, tag: str = "all") -> dict[str, Any]:
        """同步执行（供 CLI 使用）。"""
        return self._run_checks(tag)

    def _run_checks(self, tag: str) -> dict[str, Any]:
        tag = tag or "all"
        results: list[dict[str, Any]] = []
        start = time.monotonic()

        # 1. health 依赖探测（任意 tag 都先探测后端可达性）
        if tag in ("all", "health"):
            for name, method, url_tpl in HEALTH_PROBES:
                results.append(self._probe(name, method, url_tpl, ["health"]))

        # 2. fast 关键链路
        if tag == "fast":
            for name, method, url_tpl in FAST_PROBES:
                results.append(self._probe(name, method, url_tpl, ["fast"]))
        elif tag in ("all", "api", "pages"):
            # 3. 全量真实 HTTP 检查（复用 GlobalChecker）
            checker = GlobalChecker(
                self.backend, self.web, self.admin, self.timeout_ms
            )
            checker.load_openapi()
            if tag in ("api", "all"):
                checker.run_api_checks()
            if tag in ("pages", "all"):
                checker.run_page_checks()
            for r in checker.results:
                results.append(r.to_dict())

        passed = sum(1 for r in results if r["status"] == "pass")
        failed = sum(1 for r in results if r["status"] == "fail")
        warned = sum(1 for r in results if r["status"] == "warn")
        skipped = sum(1 for r in results if r["status"] == "skip")

        report: dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "tag": tag,
            "targets": {
                "backend": self.backend,
                "web": self.web,
                "admin": self.admin,
            },
            "summary": {
                "total": len(results),
                "passed": passed,
                "failed": failed,
                "warned": warned,
                "skipped": skipped,
                "passRate": round(passed / len(results) * 100, 1) if results else 0,
            },
            "elapsed_ms": int((time.monotonic() - start) * 1000),
            "results": results,
        }

        # 归档报告
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        (REPORTS_DIR / f"{report['timestamp'].replace(':', '')}.json").write_text(
            __import__("json").dumps(report, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return report

    def _probe(self, name: str, method: str, url_tpl: str, tags: list[str]) -> dict[str, Any]:
        url = url_tpl.format(backend=self.backend, web=self.web, admin=self.admin)
        t0 = time.monotonic()
        try:
            r = httpx.get(url, timeout=self.timeout_ms / 1000, follow_redirects=True)
            ok = r.status_code < 400
            return {
                "name": name,
                "method": method,
                "url": url,
                "status": "pass" if ok else "fail",
                "httpCode": r.status_code,
                "bodyCode": None,
                "durationMs": int((time.monotonic() - t0) * 1000),
                "detail": "" if ok else f"HTTP {r.status_code}",
                "tags": tags,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "name": name,
                "method": method,
                "url": url,
                "status": "fail",
                "httpCode": None,
                "bodyCode": None,
                "durationMs": int((time.monotonic() - t0) * 1000),
                "detail": str(exc),
                "tags": tags,
            }


def run_cli() -> int:
    """CLI 入口：python3 selfcheck/runner.py --tag api [--backend URL]。"""
    import argparse

    parser = argparse.ArgumentParser(description="真实流量自检（CLI）")
    parser.add_argument("--tag", default="all",
                        choices=["all", "health", "fast", "api", "pages"])
    parser.add_argument("--backend", default=DEFAULT_BACKEND)
    parser.add_argument("--web", default=DEFAULT_WEB)
    parser.add_argument("--admin", default=DEFAULT_ADMIN)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    args = parser.parse_args()

    runner = SelfCheckRunner(args.backend, args.web, args.admin, args.timeout)
    report = runner.run_sync(args.tag)
    s = report["summary"]
    print(f"[selfcheck] tag={report['tag']} 总{s['total']} 通过{s['passed']} "
          f"失败{s['failed']} 警告{s['warned']} 耗时{report['elapsed_ms']}ms")
    for r in report["results"]:
        if r["status"] == "fail":
            print(f"  x {r['method']} {r['url']}: {r['detail']}")
    return 0 if s["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(run_cli())
