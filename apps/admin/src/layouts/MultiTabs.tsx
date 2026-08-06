/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTabStore } from "@/stores/tabStore";
import { menuConfig, HOME_TAB_KEY } from "./menu-config";

function resolveLabel(pathname: string, t: (key: string) => string): string {
  if (pathname === "/workbench" || pathname === "/") return t("menu:workbench");
  for (const item of menuConfig) {
    if (item.path === pathname) return t(item.labelKey);
  }
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path))
        return t(child.labelKey);
    }
  }
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.includes(child.path))
        return `${t(child.labelKey)}${t("layout:detail")}`;
    }
  }
  return t("layout:unnamed");
}

export function MultiTabs() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    tabs,
    activeKey,
    addTab,
    closeTab,
    closeOthers,
    closeLeft,
    closeRight,
    closeAll,
    setActive,
  } = useTabStore();

  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/404") return;
    const label = resolveLabel(path, t);
    addTab({ key: path, label, closable: path !== `/${HOME_TAB_KEY}` });
  }, [location.pathname, t, addTab]);

  const items = useMemo(
    () =>
      tabs.map((t) => ({
        key: t.key,
        label: t.label,
        closable: t.closable,
      })),
    [tabs],
  );

  const handleChange = (key: string) => {
    setActive(key);
    navigate(key);
  };

  const handleRemove = (key: string) => {
    closeTab(key);
    const next = useTabStore.getState().activeKey;
    if (next !== key) navigate(next);
  };

  const buildContextMenu = (targetKey: string): MenuProps => ({
    items: [
      {
        key: "closeOthers",
        label: t("layout:closeOthers"),
        disabled: tabs.length <= 1,
      },
      {
        key: "closeLeft",
        label: t("layout:closeLeft"),
        disabled: tabs.findIndex((t) => t.key === targetKey) === 0,
      },
      {
        key: "closeRight",
        label: t("layout:closeRight"),
        disabled:
          tabs.findIndex((t) => t.key === targetKey) === tabs.length - 1,
      },
      { key: "closeAll", label: t("layout:closeAll") },
    ],
    onClick: (info) => {
      switch (info.key) {
        case "closeOthers":
          closeOthers(targetKey);
          navigate(targetKey);
          break;
        case "closeLeft":
          closeLeft(targetKey);
          break;
        case "closeRight":
          closeRight(targetKey);
          break;
        case "closeAll":
          closeAll();
          navigate(`/${HOME_TAB_KEY}`);
          break;
      }
    },
  });

  const renderTabBar: TabsPropsRenderTabBar = (props, DefaultTabBar) => (
    <DefaultTabBar {...props}>
      {(node: { key?: string; label?: React.ReactNode }) => (
        <Dropdown
          menu={buildContextMenu(node.key as string)}
          trigger={["contextMenu"]}
        >
          <span>{node.label}</span>
        </Dropdown>
      )}
    </DefaultTabBar>
  );

  return (
    <div className="bend-tabs" role="tablist" aria-label={t("layout:pageTabs")}>
      <Tabs
        type="card"
        size="small"
        hideAdd
        onChange={handleChange}
        activeKey={activeKey}
        items={items}
        onEdit={(targetKey, action) => {
          if (action === "remove") handleRemove(targetKey as string);
        }}
        renderTabBar={renderTabBar as any}
      />
    </div>
  );
}

type TabsPropsRenderTabBar = (
  props: Record<string, unknown>,
  DefaultTabBar: React.ComponentType<Record<string, unknown>>,
) => React.ReactNode;
