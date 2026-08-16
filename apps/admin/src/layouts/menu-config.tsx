import type { ReactNode } from "react";
import {
  DashboardOutlined,
  BookOutlined,
  AuditOutlined,
  TeamOutlined,
  SolutionOutlined,
  SafetyOutlined,
  SettingOutlined,
  BarChartOutlined,
  DollarOutlined,
  MonitorOutlined,
} from "@ant-design/icons";
import type { Permission } from "@/api/types";

export interface MenuItem {
  key: string;
  label: string;
  /** Translation key in the `menu` namespace */
  labelKey: string;
  path?: string;
  icon?: ReactNode;
  permissions?: Permission[];
  children?: MenuItem[];
  isHome?: boolean;
}

export const menuConfig: MenuItem[] = [
  {
    key: "workbench",
    label: "工作台",
    labelKey: "menu:workbench",
    path: "/workbench",
    icon: <DashboardOutlined />,
    isHome: true,
  },
  {
    key: "content",
    label: "内容管理",
    labelKey: "menu:content",
    icon: <BookOutlined />,
    children: [
      {
        key: "novel",
        label: "作品管理",
        labelKey: "menu:novelList",
        path: "/novel",
        icon: <BookOutlined />,
        permissions: ["novel.list"],
      },
      {
        key: "audit",
        label: "内容审核",
        labelKey: "menu:audit",
        path: "/audit",
        icon: <AuditOutlined />,
        permissions: ["audit.list"],
      },
      {
        key: "charts",
        label: "数据看板",
        labelKey: "menu:charts",
        path: "/charts",
        icon: <BarChartOutlined />,
      },
    ],
  },
  {
    key: "user-mgmt",
    label: "用户管理",
    labelKey: "menu:user",
    icon: <TeamOutlined />,
    children: [
      {
        key: "user",
        label: "读者列表",
        labelKey: "menu:userList",
        path: "/user",
        icon: <TeamOutlined />,
        permissions: ["user.list"],
      },
      {
        key: "author",
        label: "作者管理",
        labelKey: "menu:author",
        path: "/author",
        icon: <SolutionOutlined />,
        permissions: ["author.list"],
      },
      {
        key: "permission",
        label: "角色权限",
        labelKey: "menu:permission",
        path: "/permission",
        icon: <SafetyOutlined />,
        permissions: ["permission.assign"],
      },
    ],
  },
  {
    key: "system",
    label: "系统设置",
    labelKey: "menu:system",
    path: "/system",
    icon: <SettingOutlined />,
    permissions: ["system.config"],
  },
  {
    key: "operations",
    label: "运行看板",
    labelKey: "menu:operations",
    path: "/operations",
    icon: <MonitorOutlined />,
    permissions: ["system.config"],
  },
  {
    key: "royalty",
    label: "稿费管理",
    labelKey: "menu:royalty",
    path: "/royalty",
    icon: <DollarOutlined />,
  },
];

export const HOME_TAB_KEY = "workbench";
