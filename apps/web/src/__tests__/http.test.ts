import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, ApiError, clearCache } from "../api/http";

const AUTH_KEY = "atlas-store";

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  localStorage.clear();
  clearCache();
  vi.restoreAllMocks();
});

describe("http.get", () => {
  it("sends GET request with correct URL", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ code: 0, message: "ok", data: { id: 1 } }),
      );
    vi.stubGlobal("fetch", mock);

    const result = await http.get("/books/1");
    expect(result).toEqual({ id: 1 });
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/c/books/1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("appends query params", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: [] }));
    vi.stubGlobal("fetch", mock);

    await http.get("/books", { page: 1, pageSize: 20 });
    const url = mock.mock.calls[0]![0]!;
    expect(url).toContain("page=1");
    expect(url).toContain("pageSize=20");
  });

  it("skips empty params", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: [] }));
    vi.stubGlobal("fetch", mock);

    await http.get("/books", { page: 1, searchKey: "" });
    expect(mock.mock.calls[0]![0]!).not.toContain("searchKey");
  });
});

describe("http.post", () => {
  it("sends POST with JSON body", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    vi.stubGlobal("fetch", mock);

    await http.post("/books/1/comments", { content: "好书" });
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/c/books/1/comments",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "好书" }),
      }),
    );
  });
});

describe("http.put", () => {
  it("sends PUT request", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    vi.stubGlobal("fetch", mock);

    await http.put("/notes/1", { text: "更新" });
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/c/notes/1",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});

describe("http.patch", () => {
  it("sends PATCH request", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    vi.stubGlobal("fetch", mock);

    await http.patch("/notes/1", { text: "更新" });
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/c/notes/1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("http.del", () => {
  it("sends DELETE request", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: null }));
    vi.stubGlobal("fetch", mock);

    await http.del("/notes/1");
    expect(mock).toHaveBeenCalledWith(
      "/api/v1/c/notes/1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

describe("auth token injection", () => {
  it("injects token from localStorage", async () => {
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ state: { token: "my-token" } }),
    );
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: {} }));
    vi.stubGlobal("fetch", mock);

    await http.get("/me");
    const opts = mock.mock.calls[0]![1]!;
    expect(opts.headers["Authorization"]).toBe("Bearer my-token");
  });

  it("skips auth header when no token", async () => {
    const mock = vi
      .fn()
      .mockResolvedValue(mockResponse({ code: 0, message: "ok", data: {} }));
    vi.stubGlobal("fetch", mock);

    await http.get("/books");
    const opts = mock.mock.calls[0]![1]!;
    expect(opts.headers["Authorization"]).toBeUndefined();
  });
});

describe("error handling", () => {
  it("throws ApiError on business error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          mockResponse({ code: 400, message: "参数错误", traceId: "abc" }),
        ),
    );

    await expect(http.get("/books/1")).rejects.toThrow(ApiError);
    await expect(http.get("/books/1")).rejects.toThrow("参数错误");
  });

  it("throws ApiError on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")),
    );

    await expect(http.get("/books")).rejects.toThrow("网络异常");
  });

  it("throws ApiError on non-JSON response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => {
          throw new Error("invalid json");
        },
      }),
    );

    await expect(http.get("/books")).rejects.toThrow("服务响应异常");
  });
});
