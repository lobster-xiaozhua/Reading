import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Layout,
  Breadcrumb,
  Dropdown,
  Avatar,
  theme,
} from "antd";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCmdStore } from "@/stores/cmdStore";
import { menuConfig, type MenuItem } from "./menu-config";

const Header = Layout.Header;

interface HeaderBarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function resolveBreadcrumb(pathname: string): MenuItem[] {
  for (const item of menuConfig) {
    if (item.path === pathname) return [item];
  }
  for (const parent of menuConfig) {
    if (!parent.children) continue;
    for (const child of parent.children) {
      if (child.path && pathname.startsWith(child.path)) {
        return [parent, child];
      }
    }
  }
  return [];
}

export function HeaderBar({ collapsed, onToggle }: HeaderBarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const openPalette = useCmdStore((s) => s.openPalette);
  const { token } = theme.useToken();

  const breadcrumbItems = useMemo(() => {
    const chain = resolveBreadcrumb(location.pathname);
    return chain.map((item) => ({ title: t(item.labelKey) }));
  }, [location.pathname, t]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t("layout:profile"),
      disabled: true,
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("layout:accountSettings"),
      disabled: true,
    },
    { type: "divider" as const },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("layout:logout"),
      danger: true,
    },
  ];

  const handleUserMenu = (info: { key: string }) => {
    if (info.key === "logout") handleLogout();
  };

  return (
    <Header
      className="bend-header"
      style={{ background: token.colorBgContainer, height: 64, padding: 0 }}
    >
      <button
        type="button"
        className="bend-header__collapse"
        onClick={onToggle}
        aria-label={
          collapsed ? t("layout:expandSidebar") : t("layout:collapseSidebar")
        }
        aria-expanded={!collapsed}
      >
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      <Breadcrumb items={breadcrumbItems} className="bend-header__breadcrumb" />

      <div className="bend-header__right">
        <button
          type="button"
          className="bend-header__palette"
          onClick={openPalette}
          aria-label={t("layout:globalSearch")}
        >
          <SearchOutlined />
          <span className="bend-header__palette-text">
            {t("layout:searchPlaceholder")}
          </span>
          <kbd className="bend-header__palette-kbd">Ctrl K</kbd>
        </button>
        <Dropdown
          placement="bottomRight"
          trigger={["click"]}
          dropdownRender={() => (
            <div className="bend-header__notify-panel">
              <div className="bend-header__notify-empty">{t("layout:notificationsEmpty")}</div>
            </div>
          )}
        >
          <button
            type="button"
            className="bend-header__icon-btn"
            aria-label={t("layout:notifications")}
          >
            <BellOutlined />
          </button>
        </Dropdown>
        <Dropdown
          menu={{ items: userMenuItems, onClick: handleUserMenu }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <button
            type="button"
            className="bend-header__user"
            aria-label={t("layout:profile")}
          >
            <Avatar size={32} src={user?.avatar} icon={<UserOutlined />} />
            <span className="bend-header__username">
              {user?.nickname ?? user?.username ?? t("layout:admin")}
            </span>
          </button>
        </Dropdown>
      </div>
    </Header>
  );
}
