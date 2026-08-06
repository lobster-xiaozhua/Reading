/* ============================================================
 * P2-5 · Breadcrumb 面包屑导航
 * items[] + separator；可点击项 --color-brand；当前页 --text-primary 不可点击
 * Source: 04 §6.15
 * ============================================================ */

import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { Breadcrumb } from "antd";
import type { BreadcrumbProps } from "antd";

export interface BBreadcrumbItem {
  /** 显示文案 */
  title: string;
  /** 点击跳转路径或回调；不填则当前页（不可点击） */
  href?: string;
  onClick?: () => void;
}

export interface BBreadcrumbProps extends Omit<
  ComponentProps<typeof Breadcrumb>,
  "items"
> {
  items: BBreadcrumbItem[];
}

/**
 * B 端面包屑
 * - 可点击项用品牌色
 * - 当前页（无 href/onClick）用主文本色，不可点击
 */
export const BBreadcrumb = forwardRef<HTMLDivElement, BBreadcrumbProps>(
  function BBreadcrumb({ items, ...rest }, ref) {
    const antdItems: BreadcrumbProps["items"] = items.map((item) => {
      const isLink = Boolean(item.href || item.onClick);
      return {
        title: isLink ? (
          <a
            href={item.href}
            onClick={(e) => {
              if (item.onClick) {
                e.preventDefault();
                item.onClick();
              }
            }}
            style={{ color: "var(--color-brand)" }}
          >
            {item.title}
          </a>
        ) : (
          <span style={{ color: "var(--color-text-primary)" }}>
            {item.title}
          </span>
        ),
      };
    });

    return (
      <div ref={ref}>
        <Breadcrumb items={antdItems} {...rest} />
      </div>
    );
  },
);
