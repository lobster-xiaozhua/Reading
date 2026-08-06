/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../stores/authStore";

function mockFetch(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ code: 0, message: "ok", data }),
    }),
  );
}

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      expiresAt: 0,
      refreshToken: null,
    });
    vi.restoreAllMocks();
  });

  it("starts unauthenticated", () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("login sets token and user", async () => {
    mockFetch({
      token: "token123",
      user: {
        id: "1",
        username: "admin",
        nickname: "Admin",
        roles: ["super-admin"],
        permissions: [],
        email: "",
        lastLoginAt: 0,
        enabled: true,
      },
      expiresAt: 3600000,
      refreshToken: "refresh123",
    });
    await useAuthStore.getState().login("admin", "admin123");
    const state = useAuthStore.getState();
    expect(state.token).toBe("token123");
    expect(state.isAuthenticated).toBe(true);
  });

  it("logout clears auth", () => {
    useAuthStore.setState({
      token: "x",
      user: { id: "1" } as any,
      isAuthenticated: true,
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("hasPermission returns true for super-admin", () => {
    useAuthStore.setState({
      user: { id: "1", roles: ["super-admin"], permissions: [] } as any,
    });
    expect(useAuthStore.getState().hasPermission("novel.create")).toBe(true);
  });

  it("hasPermission checks user permissions", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        roles: ["content-admin"],
        permissions: ["novel.list", "novel.edit"],
      } as any,
    });
    expect(useAuthStore.getState().hasPermission("novel.list")).toBe(true);
    expect(useAuthStore.getState().hasPermission("novel.create")).toBe(false);
  });

  it("hasPermission returns false when no user", () => {
    expect(useAuthStore.getState().hasPermission("novel.list")).toBe(false);
  });

  it("hasRole checks user roles", () => {
    useAuthStore.setState({
      user: {
        id: "1",
        roles: ["content-admin", "auditor"],
        permissions: [],
      } as any,
    });
    expect(useAuthStore.getState().hasRole("content-admin")).toBe(true);
    expect(useAuthStore.getState().hasRole("super-admin")).toBe(false);
  });
});
