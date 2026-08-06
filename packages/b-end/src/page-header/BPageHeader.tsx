/* ============================================================
 * P2-1 · PageHeader 页面标题
 * title H2 28px semibold + breadcrumb + extra + tags + onBack
 * AntD PageHeader 已废弃，用 Typography.Title + Breadcrumb + Space 组合实现
 * Source: 04 §6.4
 * ============================================================ */

import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Typography, Space, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { BBreadcrumb } from "../breadcrumb/BBreadcrumb.js";
import type { BBreadcrumbProps } from "../breadcrumb/BBreadcrumb.js";

const { Title } = Typography;

export interface BPageHeaderProps {
  /** 页面标题（H2 28px） */
  title: string;
  /** 面包屑配置 */
  breadcrumb?: BBreadcrumbProps["items"];
  /** 标题右侧标签 */
  tags?: ReactNode;
  /** 标题右侧操作区 */
  extra?: ReactNode;
  /** 子标题/描述 */
  subTitle?: ReactNode;
  /** 返回按钮回调（不传则不显示返回按钮） */
  onBack?: () => void;
  /** 返回按钮文案，默认"返回" */
  backText?: string;
}

/**
 * B 端页面标题
 * - title 用 H2 (28px semibold)
 * - 可选面包屑、标签、操作按钮、返回
 */
export const BPageHeader = forwardRef<HTMLDivElement, BPageHeaderProps>(
  function BPageHeader(
    { title, breadcrumb, tags, extra, subTitle, onBack, backText = "返回" },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className="b-page-header"
        style={{ marginBottom: "var(--space-5)" }}
      >
        {breadcrumb && breadcrumb.length > 0 && (
          <BBreadcrumb
            items={breadcrumb}
            style={{ marginBottom: "var(--space-2)" }}
          />
        )}
        <div
          className="b-page-header__main"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          {onBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={onBack}
              aria-label={backText}
            >
              {backText}
            </Button>
          )}
          <Title
            level={2}
            style={{
              margin: 0,
              fontSize: "var(--font-size-h2, 28px)",
              fontWeight: 600,
            }}
          >
            {title}
          </Title>
          {tags && <Space size="small">{tags}</Space>}
          {subTitle && (
            <span
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-body, 14px)",
              }}
            >
              {subTitle}
            </span>
          )}
          {extra && (
            <div
              className="b-page-header__extra"
              style={{ marginLeft: "auto" }}
            >
              {extra}
            </div>
          )}
        </div>
      </div>
    );
  },
);
