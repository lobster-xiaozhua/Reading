/* ============================================================
 * P0-4 · AntD ConfigProvider + CSS Variables 桥接令牌
 *
 * 桥接策略：
 * 1. 通过 ConfigProvider.theme.token 注入 antdTokenMap（P0-5）
 * 2. 监听 @novel/tokens ThemeProvider 的 resolvedUITheme
 * 3. 暗色时合并 antdDarkTokenOverride
 * 4. 通过 @ant-design/cssinjs 提取静态 CSS（避免运行时 FOUC）
 *
 * Source: 04-B端专项设计.md §11.6 / 01-前端底层设计.md §12
 * ============================================================ */

import { useMemo, type ReactNode } from "react";
import { ConfigProvider, App as AntApp, type ThemeConfig } from "antd";
import zhCN from "antd/locale/zh_CN";
import { ThemeProvider, useTheme } from "@novel/tokens/react";
import { antdTokenMap, antdDarkTokenOverride } from "./token-map";

/**
 * AntD 主题配置（在 ThemeProvider 内消费 resolvedUITheme）
 */
function AntdThemeConfig({ children }: { children: ReactNode }) {
  const { resolvedUITheme } = useTheme();

  const themeConfig = useMemo<ThemeConfig>(
    () => ({
      token:
        resolvedUITheme === "dark"
          ? { ...antdTokenMap, ...antdDarkTokenOverride }
          : antdTokenMap,
      components: {
        // 表格紧凑型（04 §6.1）
        Table: {
          headerBg: "var(--color-bg-subtle)",
          headerColor: "var(--color-text-secondary)",
          rowHoverBg: "var(--color-bg-subtle)",
          rowSelectedBg: "var(--color-brand-bg)",
          rowSelectedHoverBg: "var(--color-brand-bg)",
          cellPaddingBlock: 12,
          cellPaddingInline: 16,
        },
        // 按钮（04 §6.1 不发明冲突模式）
        Button: {
          controlHeight: 32,
          controlHeightSM: 24,
          controlHeightLG: 40,
          paddingInline: 16,
        },
        // 表单（04 §6.6 vertical 布局）
        Form: {
          itemMarginBottom: 24,
        },
        // 卡片
        Card: {
          headerBg: "transparent",
          paddingLG: 24,
        },
        // 菜单（侧边栏）
        Menu: {
          itemHeight: 40,
          subMenuItemBg: "transparent",
          itemSelectedBg: "var(--color-brand-bg)",
          itemSelectedColor: "var(--color-brand)",
        },
      },
    }),
    [resolvedUITheme],
  );

  return (
    <ConfigProvider theme={themeConfig} locale={zhCN}>
      {/* AntApp 提供 message/notification/modal 静态方法的上下文 */}
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}

/**
 * B 端根 Provider：组合 ThemeProvider + AntD ConfigProvider
 *
 * 嵌套顺序：
 * ThemeProvider（管理 data-theme 属性 + CSS var 切换）
 *   └─ AntdThemeConfig（读取 resolvedUITheme，注入 AntD token）
 *        └─ children
 */
export interface AtlasAdminProviderProps {
  children: ReactNode;
  /** 初始 UI 主题，默认 system */
  defaultUITheme?: "light" | "dark" | "system";
}

export function AtlasAdminProvider({
  children,
  defaultUITheme = "system",
}: AtlasAdminProviderProps) {
  return (
    <ThemeProvider defaultUITheme={defaultUITheme}>
      <AntdThemeConfig>{children}</AntdThemeConfig>
    </ThemeProvider>
  );
}
