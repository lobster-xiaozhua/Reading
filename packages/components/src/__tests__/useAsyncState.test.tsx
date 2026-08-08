import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useAsyncState } from "../useAsyncState";

describe("useAsyncState", () => {
  it("deps 变化后，旧请求的结果不会覆盖新请求的状态", async () => {
    let resolveFirst: (v: string[]) => void = () => {};
    let resolveSecond: (v: string[]) => void = () => {};
    const first = new Promise<string[]>((r) => {
      resolveFirst = r;
    });
    const second = new Promise<string[]>((r) => {
      resolveSecond = r;
    });
    let call = 0;
    const fn = vi.fn(() => {
      call += 1;
      return call === 1 ? first : second;
    });

    const { result, rerender } = renderHook(
      ({ deps }) =>
        useAsyncState<string[]>(fn as never, {
          deps: [deps],
          initial: [] as string[],
          loadingDelay: 0,
        }),
      { initialProps: { deps: "a" } },
    );

    // 第一次请求挂起（deps=a）
    await act(async () => {
      await Promise.resolve();
    });

    // deps 变化 → 触发第二次请求（deps=b）
    rerender({ deps: "b" });
    await act(async () => {
      await Promise.resolve();
    });
    expect(fn).toHaveBeenCalledTimes(2);

    // 旧请求后完成：结果应被丢弃，不得覆盖新请求状态
    await act(async () => {
      resolveFirst(["old"]);
    });
    expect(result.current.data).not.toEqual(["old"]);
    expect(result.current.loading).toBe(true);

    // 新请求完成：状态应更新为新数据
    await act(async () => {
      resolveSecond(["new"]);
    });
    expect(result.current.data).toEqual(["new"]);
    expect(result.current.status).toBe("success");
    expect(result.current.loading).toBe(false);
  });

  it("同周期内重复调用 run 复用同一请求（去重）", async () => {
    let resolve: (v: string[]) => void = () => {};
    const promise = new Promise<string[]>((r) => {
      resolve = r;
    });
    const fn = vi.fn(() => promise);

    const { result } = renderHook(() =>
      useAsyncState<string[]>(fn as never, {
        immediate: false,
        initial: [] as string[],
        loadingDelay: 0,
      }),
    );

    let p1: Promise<string[] | null>;
    let p2: Promise<string[] | null>;
    await act(async () => {
      p1 = result.current.run();
      p2 = result.current.run();
      resolve(["data"]);
    });
    // run 是 async 包装，Promise 对象不同但应复用同一底层请求（仅发起一次）
    expect(fn).toHaveBeenCalledTimes(1);
    await expect(p1).resolves.toEqual(["data"]);
    await expect(p2).resolves.toEqual(["data"]);
    expect(result.current.data).toEqual(["data"]);
  });
});
