import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../stores/authStore";
import { useHistoryStore } from "../stores/historyStore";
import { useSearchStore } from "../stores/searchStore";

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, user: null });
  });

  it("starts unauthenticated", () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  it("setAuth stores token and user", () => {
    const user = { id: "1", username: "reader", nickname: "读者" };
    useAuthStore.getState().setAuth("token123", user);
    const state = useAuthStore.getState();
    expect(state.token).toBe("token123");
    expect(state.user).toEqual(user);
  });

  it("logout clears auth", () => {
    useAuthStore
      .getState()
      .setAuth("token123", { id: "1", username: "reader", nickname: "读者" });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });
});

describe("searchStore", () => {
  beforeEach(() => {
    useSearchStore.setState({ history: [] });
  });

  it("starts with empty history", () => {
    expect(useSearchStore.getState().history).toEqual([]);
  });

  it("addHistory appends keyword", () => {
    useSearchStore.getState().addHistory("玄幻");
    const history = useSearchStore.getState().history;
    expect(history).toContain("玄幻");
  });

  it("addHistory deduplicates", () => {
    useSearchStore.getState().addHistory("玄幻");
    useSearchStore.getState().addHistory("玄幻");
    expect(useSearchStore.getState().history.length).toBe(1);
  });

  it("addHistory moves duplicate to front", () => {
    useSearchStore.getState().addHistory("A");
    useSearchStore.getState().addHistory("B");
    useSearchStore.getState().addHistory("A");
    const history = useSearchStore.getState().history;
    expect(history[0]).toBe("A");
    expect(history.length).toBe(2);
  });

  it("addHistory trims to 10", () => {
    for (let i = 0; i < 15; i++) {
      useSearchStore.getState().addHistory(`keyword${i}`);
    }
    expect(useSearchStore.getState().history.length).toBe(10);
  });

  it("removeHistory removes specific keyword", () => {
    useSearchStore.getState().addHistory("玄幻");
    useSearchStore.getState().addHistory("都市");
    useSearchStore.getState().removeHistory("玄幻");
    expect(useSearchStore.getState().history).toEqual(["都市"]);
  });

  it("clearHistory empties history", () => {
    useSearchStore.getState().addHistory("玄幻");
    useSearchStore.getState().clearHistory();
    expect(useSearchStore.getState().history).toEqual([]);
  });
});

describe("historyStore", () => {
  beforeEach(() => {
    useHistoryStore.setState({ entries: {} });
  });

  it("starts with empty entries", () => {
    expect(useHistoryStore.getState().entries).toEqual({});
  });

  it("recordReading stores per book", () => {
    useHistoryStore.getState().recordReading({
      bookId: "1",
      chapterId: "c1",
      chapterIndex: 2,
      chapterTitle: "第二章",
      percent: 0.5,
      readAt: 100,
    });
    const entry = useHistoryStore.getState().getEntry("1");
    expect(entry?.chapterId).toBe("c1");
    expect(entry?.percent).toBe(0.5);
  });

  it("recordReading updates the same book", () => {
    useHistoryStore.getState().recordReading({
      bookId: "1",
      chapterId: "c1",
      chapterIndex: 1,
      chapterTitle: "一",
      percent: 0.2,
      readAt: 1,
    });
    useHistoryStore.getState().recordReading({
      bookId: "1",
      chapterId: "c2",
      chapterIndex: 3,
      chapterTitle: "三",
      percent: 0.8,
      readAt: 2,
    });
    const entry = useHistoryStore.getState().getEntry("1");
    expect(entry?.chapterId).toBe("c2");
    expect(Object.keys(useHistoryStore.getState().entries).length).toBe(1);
  });

  it("keeps per-book entries isolated", () => {
    useHistoryStore.getState().recordReading({
      bookId: "1",
      chapterId: "c1",
      chapterIndex: 1,
      chapterTitle: "一",
      percent: 0,
      readAt: 1,
    });
    useHistoryStore.getState().recordReading({
      bookId: "2",
      chapterId: "c9",
      chapterIndex: 9,
      chapterTitle: "九",
      percent: 0,
      readAt: 2,
    });
    expect(useHistoryStore.getState().getEntry("2")?.chapterId).toBe("c9");
    expect(Object.keys(useHistoryStore.getState().entries).length).toBe(2);
  });
});
