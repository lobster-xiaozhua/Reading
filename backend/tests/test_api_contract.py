"""API 真实请求契约测试：遍历全部 GET 端点验证统一响应体结构。

对齐 §5.1 响应契约：所有业务端点必须返回 ``{code, message, data, traceId}``。
用演示数据/默认参数实际发请求，验证结构而非业务成功（业务错误也应有统一结构）。
"""

import re

import pytest

pytestmark = pytest.mark.api

# 排除非业务端点（不走统一响应体）
_SKIP_PATHS = {"/health", "/metrics"}

# path 参数示例值填充（数字 ID 用 1，枚举/字符串用常见值）
_PATH_PARAM_FILL = {
    "book_id": "1",
    "chapter_id": "1",
    "novel_id": "1",
    "item_id": "1",
    "reader_id": "1",
    "note_id": "1",
    "comment_id": "1",
    "role_key": "admin",
    "rank_type": "hot",
}

_PATH_PARAM_RE = re.compile(r"\{([a-zA-Z_]+)\}")


def _fill_path(path: str) -> str:
    """将路径模板中的参数替换为示例值。"""

    def _replace(match):
        name = match.group(1)
        return _PATH_PARAM_FILL.get(name, "1")

    return _PATH_PARAM_RE.sub(_replace, path)


def _get_endpoints():
    """收集所有 GET 端点（path 模板 → 填充后的 URL）。"""
    from app.main import app

    schema = app.openapi()
    endpoints = []
    for path, methods in sorted(schema["paths"].items()):
        if path in _SKIP_PATHS:
            continue
        if "get" not in methods:
            continue
        endpoints.append((path, _fill_path(path)))
    return endpoints


def test_get_endpoints_collected():
    """至少收集一批 GET 端点，确保遍历有效。"""
    endpoints = _get_endpoints()
    assert len(endpoints) >= 40


@pytest.mark.parametrize("template,url", _get_endpoints())
async def test_get_endpoint_unified_response(client, template, url):
    """每个 GET 端点返回统一响应体 {code, message, data}。"""
    resp = await client.get(url)
    # 业务错误 HTTP 200（code≠0）；鉴权/资源缺失保留 4xx，但同样走统一响应体
    assert resp.status_code in (200, 401, 403, 404, 422), f"{url} 状态码异常 {resp.status_code}"
    try:
        body = resp.json()
    except Exception:
        pytest.fail(f"{url} 返回非 JSON 响应: {resp.text[:200]}")
    assert isinstance(body, dict), f"{url} 响应不是对象"
    assert "code" in body, f"{url} 缺少 code 字段"
    assert "message" in body, f"{url} 缺少 message 字段"
    assert "data" in body, f"{url} 缺少 data 字段"


def _write_endpoints():
    """收集所有非 GET 端点：(method, 填充后 URL, 是否需要请求体)。

    写端点用空请求体触发参数校验路径（422 统一响应体），
    验证契约而非业务成功路径。
    """
    from app.main import app

    schema = app.openapi()
    endpoints = []
    for path, methods in sorted(schema["paths"].items()):
        if path in _SKIP_PATHS:
            continue
        for method, op in methods.items():
            if method == "get":
                continue
            has_body = "requestBody" in op
            endpoints.append((method.upper(), _fill_path(path), has_body))
    return endpoints


def test_write_endpoints_collected():
    """至少收集一批写端点，确保遍历有效。"""
    endpoints = _write_endpoints()
    assert len(endpoints) >= 30


@pytest.mark.parametrize("method,url,has_body", _write_endpoints())
async def test_write_endpoint_unified_response(client, method, url, has_body):
    """每个非 GET 端点（空请求体）返回统一响应体 {code, message, data}。"""
    payload = {} if has_body else None
    resp = await client.request(method, url, json=payload)
    assert resp.status_code in (200, 400, 401, 403, 404, 422), f"{method} {url} 状态码异常 {resp.status_code}"
    try:
        body = resp.json()
    except Exception:
        pytest.fail(f"{method} {url} 返回非 JSON 响应: {resp.text[:200]}")
    assert isinstance(body, dict), f"{method} {url} 响应不是对象"
    assert "code" in body, f"{method} {url} 缺少 code 字段"
    assert "message" in body, f"{method} {url} 缺少 message 字段"
    assert "data" in body, f"{method} {url} 缺少 data 字段"
