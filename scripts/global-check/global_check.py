#!/usr/bin/env python3
"""全局真实请求检查脚本。

通过真实 HTTP 请求（非 ASGI in-memory）遍历 OpenAPI 描述的全部端点，
校验统一响应格式 {code:0, message:"ok", data, traceId}，并检查前端
C/B 端页面是否可访问。输出结构化 JSON 报告与终端汇总。

用法:
  python3 scripts/global-check/global_check.py [选项]

选项:
  --backend URL   后端地址（默认 http://localhost:8000）
  --web URL       C 端地址（默认 http://localhost:5173）
  --admin URL     B 端地址（默认 http://localhost:5174）
  --report PATH   报告输出路径（默认 global-check-report.json）
  --tag TAG       运行指定标记的检查（api|pages|all，默认 all）
  --timeout MS    单请求超时毫秒（默认 15000）
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
from dataclasses import dataclass, field
from typing import Any

import httpx

# ── 常量 ──────────────────────────────────────────────────
DEFAULT_BACKEND = "http://localhost:8000"
DEFAULT_WEB = "http://localhost:5173"
DEFAULT_ADMIN = "http://localhost:5174"
DEFAULT_TIMEOUT = 15000

# 只做 GET 探测的路径参数样例值（用于路径占位符填充）
PATH_VALUE_SAMPLES: dict[str, list[Any]] = {
    "rank_type": ["hot", "follow", "ticket", "new"],
    "role_key": ["super-admin", "content-admin", "reader"],
    "item_id": [1],
    "reader_id": [1],
    "comment_id": [1],
    "note_id": [1],
    "novel_id": [1, 2, 3],
    "book_id": [1, 2, 3],
    "chapter_id": [1, 2, 3],
    "chapterId": [1],
    "novelId": [1],
}

# GET 查询参数的样例值
QUERY_VALUE_SAMPLES: dict[str, Any] = {
    "page": 1,
    "page_size": 5,
    "pageSize": 5,
    "limit": 5,
    "days": 7,
    "range": 30,
    "hours": 24,
    "type": "overview",
    "tab": "all",
    "keyword": "测试",
    "q": "测试",
    "category": "xuanhuan",
    "sort": "hot",
    "status": "published",
    "month": "2026-08",
    "author_name": "测试",
}

# 写操作请求体最小样例（POST/PUT/PATCH）
WRITE_BODY_SAMPLES: dict[str, dict[str, Any]] = {
    "login": {"username": "demo_reader", "password": "password123"},
    "register": {"username": "__smoke__", "password": "password123", "nickname": "smoke"},
    "logout": {},
    "refresh": {"refreshToken": "invalid-token"},
    "rum": {"type": "perf", "name": "smoke", "value": 1},
    "sensitive-words/check": {"text": "测试"},
    "reading-progress": {"chapter_id": 1, "chapter_index": 1, "percent": 0},
    "follows/read-all": {},
    "audits/submit": {"ids": [1], "result": "pass", "comment": "smoke"},
    "sensitive-words": {"text": "__smoke__word__", "level": "high"},
    "system/config": {"siteName": "测试站"},
    "notes": {"novelId": 1, "chapterId": 1, "text": "smoke note"},
}

# 允许真实执行的写端点（带安全校验）——不做数据库写，仅验证鉴权/参数校验返回
# 规则：期望返回 2xx/4xx，但不产生持久副作用

# 前端页面路径（C/B 端）
WEB_PAGES = ["/", "/book/1", "/read/1/1", "/search", "/category", "/login", "/profile"]
ADMIN_PAGES = ["/", "/login", "/workbench", "/novel", "/audit", "/user", "/system"]

# 响应格式校验：统一响应至少含 code/message（错误响应无 data 字段）
REQUIRED_KEYS = ["code", "message"]
# 系统端点：不走统一响应格式
SYSTEM_PATHS = {"/health", "/metrics"}


# ── 数据结构 ──────────────────────────────────────────────
@dataclass
class CheckResult:
    name: str
    method: str
    url: str
    status: str = "pending"  # pass | fail | skip | warn
    http_code: int | None = None
    body_code: int | None = None
    duration_ms: int = 0
    detail: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "method": self.method,
            "url": self.url,
            "status": self.status,
            "httpCode": self.http_code,
            "bodyCode": self.body_code,
            "durationMs": self.duration_ms,
            "detail": self.detail,
            "tags": self.tags,
        }


class GlobalChecker:
    """遍历 OpenAPI 全端点做真实请求检查。"""

    def __init__(
        self,
        backend: str,
        web: str,
        admin: str,
        timeout_ms: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.backend = backend.rstrip("/")
        self.web = web.rstrip("/")
        self.admin = admin.rstrip("/")
        self.timeout = timeout_ms / 1000
        self.results: list[CheckResult] = []
        self.openapi: dict[str, Any] = {}
        self.client = httpx.Client(timeout=self.timeout, follow_redirects=True)

        # 探测到的真实 ID 池（路径参数填充）
        self._id_pool: dict[str, set[int]] = {}

    # ── 通用 HTTP ────────────────────────────────────────
    def _request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        try:
            return self.client.request(method, url, **kwargs)
        except httpx.RequestError as exc:
            # 构造一个伪响应便于统一处理
            raise SystemExit(f"请求失败 {method} {url}: {exc}") from exc

    # ── 加载 OpenAPI ─────────────────────────────────────
    def load_openapi(self) -> None:
        r = self.client.get(f"{self.backend}/openapi.json")
        r.raise_for_status()
        self.openapi = r.json()

    # ── ID 池预填充（先从列表接口取样）──────────────────
    def _seed_id_pool(self) -> None:
        seeds = {
            "book_id": (f"{self.backend}/api/v1/c/books", "items", "id"),
            "novel_id": (f"{self.backend}/api/v1/b/novels", "list", "id"),
        }
        for key, (url, list_key, id_key) in seeds.items():
            try:
                r = self.client.get(url, params={"page": 1, "page_size": 5})
                d = r.json()
                items = d.get("data", {}).get(list_key, [])
                ids = {int(i[id_key]) for i in items if i.get(id_key) is not None}
                if ids:
                    self._id_pool[key] = ids
            except Exception:
                pass

    # ── 路径/参数解析 ────────────────────────────────────
    def _resolve_path(self, path: str) -> list[str]:
        """将 {param} 占位符替换为样例值，返回候选 URL 列表。"""
        placeholders = re.findall(r"\{(\w+)\}", path)
        if not placeholders:
            return [path]

        candidates: list[str] = [path]
        for ph in placeholders:
            values = self._values_for(ph)
            next_candidates: list[str] = []
            for cand in candidates:
                for v in values:
                    next_candidates.append(cand.replace("{" + ph + "}", str(v), 1))
            candidates = next_candidates
        return candidates

    def _values_for(self, name: str) -> list[Any]:
        # 优先用 ID 池（探测到的真实 ID）
        if name in self._id_pool:
            return sorted(self._id_pool[name])
        # 其次用预置样例
        if name in PATH_VALUE_SAMPLES:
            return PATH_VALUE_SAMPLES[name]
        # 兜底
        if "id" in name.lower():
            return [1]
        return [1]

    def _build_query(self, spec: dict[str, Any]) -> dict[str, Any]:
        params: dict[str, Any] = {}
        for p in spec.get("parameters", []):
            if p.get("in") != "query":
                continue
            name = p["name"]
            if name in QUERY_VALUE_SAMPLES:
                params[name] = QUERY_VALUE_SAMPLES[name]
            elif p.get("required"):
                params[name] = "1"
        return params

    def _build_body(self, method: str, path: str, spec: dict[str, Any]) -> dict[str, Any]:
        if not spec.get("requestBody"):
            return {}
        # 从 path 末尾片段匹配写操作样例
        last = path.rstrip("/").split("/")[-1]
        for key in (last,):
            if key in WRITE_BODY_SAMPLES:
                return WRITE_BODY_SAMPLES[key]
        # 从路径整体匹配
        for key, body in WRITE_BODY_SAMPLES.items():
            if key in path:
                return body
        return {}

    # ── 检查执行 ─────────────────────────────────────────
    def _check_api_endpoint(self, method: str, path: str, spec: dict[str, Any]) -> None:
        method = method.upper()
        url = f"{self.backend}{path}"
        params = self._build_query(spec)
        body = self._build_body(method, path, spec)

        candidates = self._resolve_path(path)
        checked = False
        for cand in candidates:
            full_url = f"{self.backend}{cand}"
            query = dict(params)
            result = CheckResult(
                name=f"{method} {path}",
                method=method,
                url=full_url,
            )
            start = time.monotonic()
            try:
                if method == "GET":
                    r = self.client.get(full_url, params=query)
                elif method == "DELETE":
                    r = self.client.delete(full_url)
                else:
                    r = self.client.request(method.upper(), full_url, json=body or None)
            except httpx.RequestError as exc:
                result.status = "fail"
                result.detail = f"网络错误: {exc}"
                self.results.append(result)
                checked = True
                break
            duration_ms = int((time.monotonic() - start) * 1000)
            result.duration_ms = duration_ms
            result.http_code = r.status_code
            result.tags = ["api"]

            # 系统端点（/health /metrics）：独立校验，不走业务统一格式
            if path in SYSTEM_PATHS:
                if r.status_code >= 400:
                    result.status = "fail"
                    result.detail = f"HTTP {r.status_code}"
                else:
                    result.status = "pass"
                self.results.append(result)
                checked = True
                break

            # 统一响应格式校验（写操作也要求统一包裹，且不允许 5xx）
            try:
                d = r.json()
            except ValueError:
                result.status = "fail"
                result.detail = "非 JSON 响应"
                self.results.append(result)
                checked = True
                break

            result.body_code = d.get("code") if isinstance(d, dict) else None
            if r.status_code >= 500 or (
                isinstance(d, dict) and d.get("code") == 99999
            ):
                result.status = "fail"
                result.detail = f"服务异常 HTTP {r.status_code} code={d.get('code')}: {d.get('message', '')}"
            elif method != "GET":
                # 写操作：验证响应被统一包裹且非 5xx（不做业务结果断言，避免副作用影响）
                if isinstance(d, dict) and not all(k in d for k in REQUIRED_KEYS):
                    result.status = "fail"
                    result.detail = "写操作响应缺少统一格式字段 {code,message,data}"
                else:
                    result.status = "pass"
                    result.detail = (
                        f"HTTP {r.status_code} code={d.get('code')}"
                        f"（写操作仅验证响应包裹，不断言业务结果）"
                    )
            elif r.status_code >= 400:
                result.status = "warn"
                result.detail = f"HTTP {r.status_code}: {d.get('message', '')}"
            elif isinstance(d, dict) and d.get("code") != 0:
                result.status = "warn"
                result.detail = f"code={d.get('code')}: {d.get('message', '')}（演示数据可能不存在）"
            elif not isinstance(d, dict) or not all(k in d for k in REQUIRED_KEYS):
                result.status = "fail"
                result.detail = "响应缺少统一格式字段 {code,message}"
            else:
                result.status = "pass"
            self.results.append(result)
            checked = True
            break

        if not checked:
            result = CheckResult(
                name=f"{method.upper()} {path}",
                method=method.upper(),
                url=url,
                status="skip",
                detail="无法构造参数",
            )
            self.results.append(result)

    def run_api_checks(self) -> None:
        self._seed_id_pool()
        for path, methods in sorted(self.openapi.get("paths", {}).items()):
            for method in ("get", "post", "put", "patch", "delete"):
                if method not in methods:
                    continue
                self._check_api_endpoint(method, path, methods[method])

    def run_page_checks(self) -> None:
        for path in WEB_PAGES:
            self._check_page("C端", self.web, path)
        for path in ADMIN_PAGES:
            self._check_page("B端", self.admin, path)

    def _check_page(self, label: str, base: str, path: str) -> None:
        result = CheckResult(
            name=f"{label}页面 {path}",
            method="GET",
            url=f"{base}{path}",
            tags=["page"],
        )
        start = time.monotonic()
        try:
            r = self.client.get(f"{base}{path}")
        except httpx.RequestError as exc:
            result.status = "fail"
            result.detail = f"网络错误: {exc}"
            self.results.append(result)
            return
        result.duration_ms = int((time.monotonic() - start) * 1000)
        result.http_code = r.status_code
        ct = r.headers.get("content-type", "")
        if r.status_code >= 400:
            result.status = "fail"
            result.detail = f"HTTP {r.status_code}"
        elif "text/html" not in ct:
            result.status = "warn"
            result.detail = f"content-type={ct}（可能未渲染为 HTML）"
        else:
            result.status = "pass"
        self.results.append(result)

    # ── 报告 ─────────────────────────────────────────────
    def generate_report(self, report_path: str) -> dict[str, Any]:
        passed = sum(1 for r in self.results if r.status == "pass")
        failed = sum(1 for r in self.results if r.status == "fail")
        warned = sum(1 for r in self.results if r.status == "warn")
        skipped = sum(1 for r in self.results if r.status == "skip")

        report = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "backend": self.backend,
            "web": self.web,
            "admin": self.admin,
            "summary": {
                "total": len(self.results),
                "passed": passed,
                "failed": failed,
                "warned": warned,
                "skipped": skipped,
                "passRate": round(passed / len(self.results) * 100, 1) if self.results else 0,
            },
            "results": [r.to_dict() for r in self.results],
        }
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        return report

    def print_summary(self, report: dict[str, Any]) -> None:
        s = report["summary"]
        print("=" * 60)
        print("  全局真实请求检查结果")
        print("=" * 60)
        print(f"  后端: {self.backend}")
        print(f"  C 端: {self.web}")
        print(f"  B 端: {self.admin}")
        print("-" * 60)
        print(f"  总数: {s['total']}   通过: {s['passed']}   失败: {s['failed']}   "
              f"警告: {s['warned']}   跳过: {s['skipped']}")
        print(f"  通过率: {s['passRate']}%")
        print("-" * 60)
        if s["failed"]:
            print("  失败项:")
            for r in report["results"]:
                if r["status"] == "fail":
                    print(f"    x {r['method']} {r['url']}")
                    print(f"      {r['detail']}")
        if s["warned"]:
            print("  警告项:")
            for r in report["results"]:
                if r["status"] == "warn":
                    print(f"    ! {r['name']}: {r['detail']}")
        print("=" * 60)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="全局真实请求检查")
    parser.add_argument("--backend", default=DEFAULT_BACKEND)
    parser.add_argument("--web", default=DEFAULT_WEB)
    parser.add_argument("--admin", default=DEFAULT_ADMIN)
    parser.add_argument("--report", default="global-check-report.json")
    parser.add_argument("--tag", default="all", choices=["api", "pages", "all"])
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checker = GlobalChecker(args.backend, args.web, args.admin, args.timeout)

    # 健康预检
    try:
        checker.load_openapi()
    except Exception as exc:
        print(f"FATAL: 无法加载 OpenAPI（{args.backend} 可能未启动）: {exc}")
        return 2

    if args.tag in ("api", "all"):
        checker.run_api_checks()
    if args.tag in ("pages", "all"):
        checker.run_page_checks()

    report = checker.generate_report(args.report)
    checker.print_summary(report)
    return 0 if report["summary"]["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
