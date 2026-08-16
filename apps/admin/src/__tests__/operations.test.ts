import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetcher } from "../api/fetcher";

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ code: 0, message: "ok", data }),
  };
}

describe("operations fetcher", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a fresh operations snapshot", async () => {
    const snapshot = { serviceStatus: "ready", results: [] };
    const request = vi.fn().mockResolvedValue(mockResponse(snapshot));
    vi.stubGlobal("fetch", request);

    await expect(fetcher.workbench.getOperations()).resolves.toEqual(snapshot);
    expect(request.mock.calls[0][0]).toMatch(/\/api\/v1\/b\/workbench\/operations\?_ts=/);
  });

  it("starts a selected check with the timeout", async () => {
    const request = vi.fn().mockResolvedValue(
      mockResponse({ jobId: "job-1", tag: "pages", status: "pending" }),
    );
    vi.stubGlobal("fetch", request);

    await fetcher.workbench.runOperationsCheck("pages", 5000);

    expect(request).toHaveBeenCalledWith(
      "/api/v1/b/workbench/operations/run",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tag: "pages", timeoutMs: 5000 }),
      }),
    );
  });

  it("polls a job with a cache-busting query", async () => {
    const request = vi.fn().mockResolvedValue(
      mockResponse({ jobId: "job-1", tag: "all", status: "done" }),
    );
    vi.stubGlobal("fetch", request);

    await expect(fetcher.workbench.getOperationsJob("job-1")).resolves.toMatchObject({
      jobId: "job-1",
      status: "done",
    });
    expect(request.mock.calls[0][0]).toMatch(/\/api\/v1\/b\/workbench\/operations\/jobs\/job-1\?_ts=/);
  });
});
