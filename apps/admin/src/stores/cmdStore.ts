/* ============================================================
 * cmdStore · 全局命令面板状态（Command Palette）
 * - 统一入口：搜索路由 / 快捷操作 / 最近访问
 * - 触发：`/` 或 `Ctrl+K`，搜索框点击
 * Source: 体验优化 · Command Palette
 * ============================================================ */

import { create } from "zustand";

export interface CmdEntry {
  /** 唯一 key */
  key: string;
  /** 分组：route / action / recent */
  group: "route" | "action" | "recent";
  /** 显示标题 */
  label: string;
  /** 副标题/说明 */
  hint?: string;
  /** 图标（可选） */
  icon?: React.ReactNode;
  /** 执行动作 */
  run: () => void;
  /** 匹配关键词（附加可搜索文本） */
  keywords?: string;
}

interface CmdState {
  open: boolean;
  query: string;
  openPalette: () => void;
  closePalette: () => void;
  setQuery: (q: string) => void;
}

export const useCmdStore = create<CmdState>((set) => ({
  open: false,
  query: "",
  openPalette: () => set({ open: true, query: "" }),
  closePalette: () => set({ open: false, query: "" }),
  setQuery: (q) => set({ query: q }),
}));
