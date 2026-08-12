/* ============================================================
 * CommandPalette · 全局命令面板（Command Palette）
 * - Raycast/Spotlight 式指令浮层：搜索路由、快捷操作、最近访问
 * - 键盘导航：↑↓ 选择 · Enter 执行 · Esc 关闭
 * - 触发：`/` 或 `Ctrl+K`，或点击头部搜索框
 * Source: 体验优化 · Command Palette
 * ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Empty } from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  AuditOutlined,
  DollarOutlined,
  SettingOutlined,
  HistoryOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useCmdStore, type CmdEntry } from "@/stores/cmdStore";
import { useTabStore } from "@/stores/tabStore";
import { menuConfig } from "@/layouts/menu-config";
import "./CommandPalette.css";

const GROUP_LABEL: Record<CmdEntry["group"], string> = {
  route: "页面",
  action: "操作",
  recent: "最近访问",
};

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open, query, closePalette, setQuery } = useCmdStore();
  const tabs = useTabStore((s) => s.tabs);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // 打开时聚焦 + 重置；关闭时归还焦点
  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      lastFocusedRef.current?.focus?.();
      lastFocusedRef.current = null;
    }
  }, [open, setQuery]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePalette();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closePalette]);

  // Focus trap：Tab/Shift+Tab 在面板内循环，避免焦点逃逸到背景
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 构建命令列表：路由 + 快捷操作 + 最近访问
  const entries = useMemo<CmdEntry[]>(() => {
    const routes: CmdEntry[] = [];
    const walk = (items: typeof menuConfig, parent: string) => {
      for (const item of items) {
        if (item.children?.length) {
          walk(item.children, t(item.labelKey));
        } else if (item.path) {
          routes.push({
            key: `route:${item.path}`,
            group: "route",
            label: t(item.labelKey),
            hint: parent ? `${parent} → ${item.path}` : item.path,
            icon: item.icon,
            keywords: `${item.path} ${item.label}`,
            run: () => navigate(item.path!),
          });
        }
      }
    };
    walk(menuConfig, "");

    const actions: CmdEntry[] = [
      {
        key: "action:new-novel",
        group: "action",
        label: t("workbench:newNovel"),
        hint: "新建作品",
        icon: <PlusOutlined />,
        keywords: "新建 作品 novel create",
        run: () => navigate("/novel/create"),
      },
      {
        key: "action:audit",
        group: "action",
        label: t("workbench:auditManage"),
        hint: "内容审核队列",
        icon: <AuditOutlined />,
        keywords: "审核 audit 待办",
        run: () => navigate("/audit"),
      },
      {
        key: "action:royalty",
        group: "action",
        label: t("workbench:royalty"),
        hint: "稿费结算",
        icon: <DollarOutlined />,
        keywords: "稿费 结算 royalty",
        run: () => navigate("/royalty"),
      },
      {
        key: "action:system",
        group: "action",
        label: t("workbench:system"),
        hint: "系统设置 / 敏感词库",
        icon: <SettingOutlined />,
        keywords: "系统 设置 敏感词 system",
        run: () => navigate("/system"),
      },
    ];

    const recents: CmdEntry[] = tabs
      .filter((tb) => tb.closable)
      .slice(-6)
      .map((tb) => ({
        key: `recent:${tb.key}`,
        group: "recent",
        label: tb.label,
        hint: tb.key,
        icon: <HistoryOutlined />,
        keywords: tb.label,
        run: () => navigate(tb.key),
      }));

    return [...routes, ...actions, ...recents];
  }, [t, navigate, tabs]);

  // 过滤
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.label} ${e.hint ?? ""} ${e.keywords ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [entries, query]);

  // 分组展示
  const grouped = useMemo(() => {
    const map = new Map<CmdEntry["group"], CmdEntry[]>();
    for (const e of filtered) {
      const list = map.get(e.group) ?? [];
      list.push(e);
      map.set(e.group, list);
    }
    return Array.from(map.entries()).map(([group, items]) => ({
      group,
      items,
    }));
  }, [filtered]);

  // 键盘导航（事件委托：焦点在输入框或命令项上均生效）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 10, filtered.length - 1));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 10, 0));
    } else if (e.key === "Enter") {
      const target = filtered[activeIndex];
      if (target) {
        target.run();
        closePalette();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="cmd-palette"
      role="dialog"
      aria-modal="true"
      aria-label="全局命令面板"
    >
      <div className="cmd-palette__backdrop" onClick={closePalette} />
      <div
        ref={panelRef}
        className="cmd-palette__panel"
        onKeyDown={handleKeyDown}
      >
        <div className="cmd-palette__input-wrap">
          <SearchOutlined className="cmd-palette__prefix" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="搜索页面、操作或最近访问…"
            className="cmd-palette__input"
            aria-label="搜索命令"
          />
          <kbd className="cmd-palette__kbd">Esc</kbd>
        </div>

        <div className="cmd-palette__body">
          {filtered.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={`没有匹配「${query}」的结果`}
            />
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group} className="cmd-palette__group">
                <div className="cmd-palette__group-label">{GROUP_LABEL[group]}</div>
                {items.map((e) => {
                  const idx = filtered.indexOf(e);
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={e.key}
                      type="button"
                      className={`cmd-palette__item${active ? " is-active" : ""}`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => {
                        e.run();
                        closePalette();
                      }}
                    >
                      <span className="cmd-palette__item-icon">{e.icon}</span>
                      <span className="cmd-palette__item-main">
                        <span className="cmd-palette__item-label">{e.label}</span>
                        {e.hint && (
                          <span className="cmd-palette__item-hint">{e.hint}</span>
                        )}
                      </span>
                      {active && <ArrowRightOutlined className="cmd-palette__item-arrow" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmd-palette__footer">
          <span>↑↓ 选择</span>
          <span>Enter 执行</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}
