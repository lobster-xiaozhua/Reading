import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { menuConfig, type MenuItem } from "./menu-config";
import { useAuthStore } from "@/stores/authStore";
import type { Permission } from "@/api/types";

type AntdMenuItem = NonNullable<MenuProps["items"]>[number];

const Sider = Layout.Sider;

interface SiderMenuProps {
  collapsed: boolean;
}

function buildItems(
  items: MenuItem[],
  hasPermission: (p: Permission) => boolean,
  t: (key: string) => string,
): AntdMenuItem[] {
  const result: AntdMenuItem[] = [];
  for (const item of items) {
    if (item.permissions && item.permissions.length > 0) {
      const visible = item.permissions.some((p) => hasPermission(p));
      if (!visible) continue;
    }
    const node: AntdMenuItem = {
      key: item.key,
      icon: item.icon,
      label: t(item.labelKey),
    };
    if (item.path) {
      (node as AntdMenuItem & { path?: string }).path = item.path;
    }
    if (item.children && item.children.length > 0) {
      const children = buildItems(item.children, hasPermission, t);
      if (children.length === 0) continue;
      (node as AntdMenuItem & { children?: AntdMenuItem[] }).children =
        children;
    }
    result.push(node);
  }
  return result;
}

function resolveSelectedKeys(pathname: string): {
  selected: string[];
  opened: string[];
} {
  for (const item of menuConfig) {
    if (item.path === pathname) {
      return { selected: [item.key], opened: [] };
    }
  }
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path)) {
        return { selected: [child.key], opened: [parent.key] };
      }
    }
  }
  return { selected: [], opened: [] };
}

export function SiderMenu({ collapsed }: SiderMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const items = useMemo(
    () => buildItems(menuConfig, hasPermission, t),
    [hasPermission, t],
  );

  const { selected, opened } = useMemo(
    () => resolveSelectedKeys(location.pathname),
    [location.pathname],
  );

  const handleClick: MenuProps["onClick"] = (info) => {
    const findPath = (list: MenuItem[]): string | undefined => {
      for (const it of list) {
        if (it.key === info.key && it.path) return it.path;
        if (it.children) {
          const sub = findPath(it.children);
          if (sub) return sub;
        }
      }
      return undefined;
    };
    const path = findPath(menuConfig);
    if (path) navigate(path);
  };

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      collapsedWidth={80}
      className="bend-sider"
      aria-label={t("layout:mainNav")}
    >
      <div className="bend-sider__logo">
        {collapsed ? (
          <span className="bend-sider__logo-mark" aria-label="Atlas">
            A
          </span>
        ) : (
          <span className="bend-sider__logo-text">{t("common:appName")}</span>
        )}
      </div>
      <Menu
        mode="inline"
        theme="light"
        selectedKeys={selected}
        defaultOpenKeys={opened}
        openKeys={collapsed ? [] : opened}
        items={items}
        onClick={handleClick}
        className="bend-sider__menu"
      />
    </Sider>
  );
}
