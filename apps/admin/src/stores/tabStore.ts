/* ============================================================
 * P1-5 · 多 Tab 状态 Store（Zustand + persist）
 * - 已打开 Tab 列表，刷新后保留（localStorage 持久化）
 * - 首页 Tab 不可关闭
 * 04 §8.5
 * ============================================================ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { HOME_TAB_KEY } from "@/layouts/menu-config";

export interface TabItem {
  /** 路由 path，作为 key */
  key: string;
  /** 显示标题 */
  label: string;
  /** 是否可关闭（首页不可关闭） */
  closable: boolean;
}

interface TabState {
  tabs: TabItem[];
  activeKey: string;

  addTab: (tab: TabItem) => void;
  closeTab: (key: string) => void;
  closeOthers: (key: string) => void;
  closeLeft: (key: string) => void;
  closeRight: (key: string) => void;
  closeAll: () => void;
  setActive: (key: string) => void;
}

/** 首页 Tab（工作台，不可关闭） */
const HOME_TAB: TabItem = {
  key: HOME_TAB_KEY,
  label: "工作台",
  closable: false,
};

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      activeKey: HOME_TAB_KEY,

      addTab: (tab) =>
        set((state) => {
          if (state.tabs.some((t) => t.key === tab.key)) {
            return { tabs: state.tabs, activeKey: tab.key };
          }
          return { tabs: [...state.tabs, tab], activeKey: tab.key };
        }),

      closeTab: (key) => {
        const { tabs, activeKey } = get();
        const target = tabs.find((t) => t.key === key);
        if (!target || !target.closable) return; // 首页不可关闭

        const idx = tabs.findIndex((t) => t.key === key);
        const nextTabs = tabs.filter((t) => t.key !== key);

        // 关闭的是当前激活 Tab，则激活相邻 Tab
        let nextActive = activeKey;
        if (activeKey === key) {
          const neighbor =
            nextTabs[Math.min(idx, nextTabs.length - 1)] ?? HOME_TAB;
          nextActive = neighbor.key;
        }
        set({ tabs: nextTabs, activeKey: nextActive });
      },

      closeOthers: (key) => {
        const { tabs } = get();
        const keep = tabs.filter((t) => t.key === key || !t.closable);
        set({ tabs: keep, activeKey: key });
      },

      closeLeft: (key) => {
        const { tabs } = get();
        const idx = tabs.findIndex((t) => t.key === key);
        if (idx <= 0) return;
        const keep = tabs.filter((t, i) => i >= idx || !t.closable);
        set({ tabs: keep });
      },

      closeRight: (key) => {
        const { tabs } = get();
        const idx = tabs.findIndex((t) => t.key === key);
        if (idx < 0) return;
        const keep = tabs.filter((t, i) => i <= idx || !t.closable);
        set({ tabs: keep });
      },

      closeAll: () => set({ tabs: [HOME_TAB], activeKey: HOME_TAB_KEY }),

      setActive: (key) => set({ activeKey: key }),
    }),
    {
      name: "atlas-admin-tabs",
      partialize: (state) => ({ tabs: state.tabs, activeKey: state.activeKey }),
    },
  ),
);
