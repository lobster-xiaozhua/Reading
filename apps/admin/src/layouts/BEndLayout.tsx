import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "antd";
import { useHotkeys } from "react-hotkeys-hook";
import { SiderMenu } from "./SiderMenu";
import { HeaderBar } from "./HeaderBar";
import { MultiTabs } from "./MultiTabs";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { CommandPalette } from "@/components/CommandPalette";
import { useCmdStore } from "@/stores/cmdStore";
import "./bend-layout.css";

const { Content } = Layout;

const SIDER_COLLAPSE_KEY = "atlas-sider-collapsed";

/** 读取持久化的侧边栏折叠状态（刷新后保持） */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDER_COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistCollapsed(v: boolean): void {
  try {
    localStorage.setItem(SIDER_COLLAPSE_KEY, v ? "1" : "0");
  } catch {
    // localStorage 不可用时静默降级
  }
}

export function BEndLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const openPalette = useCmdStore((s) => s.openPalette);

  useHotkeys("/", (e) => {
    e.preventDefault();
    openPalette();
  });

  useHotkeys("ctrl+k", (e) => {
    e.preventDefault();
    openPalette();
  });

  useHotkeys("ctrl+s", (e) => {
    e.preventDefault();
    const saveBtn =
      document.querySelector<HTMLButtonElement>("[data-save-btn]");
    saveBtn?.click();
  });

  useHotkeys("escape", () => {
    const closeBtn = document.querySelector<HTMLElement>(
      "[data-drawer-close], .ant-modal-close",
    );
    closeBtn?.click();
  });

  return (
    <div className="bend-shell">
      <a href="#main-content" className="skip-link">
        {t("layout:skipToContent")}
      </a>
      <CommandPalette />
      <Layout className="bend-layout">
        <SiderMenu collapsed={collapsed} />
        <Layout className="bend-layout__main">
          <HeaderBar
            collapsed={collapsed}
            onToggle={() =>
              setCollapsed((v) => {
                persistCollapsed(!v);
                return !v;
              })
            }
          />
          <MultiTabs />
          <Content
            id="main-content"
            className="bend-layout__content"
            tabIndex={-1}
            style={{
              background: "var(--color-bg-page)",
              padding: "var(--space-6)",
            }}
          >
            <div className="bend-layout__inner">
              <AnimatedOutlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}
