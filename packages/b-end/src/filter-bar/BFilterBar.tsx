/* ============================================================
 * P2-2 · FilterBar 筛选栏
 * searchKey 受控 + filters[] + advancedFilters Drawer + collapsible
 * 筛选状态高亮 --color-brand
 * Source: 04 §6.2
 * ============================================================ */

import { forwardRef, useState, useMemo } from "react";
import type { ReactNode } from "react";
import { Input, Button, Space, Drawer, Form, Badge } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  UpOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

export interface FilterField {
  /** 字段 key */
  name: string;
  /** 字段标签 */
  label: string;
  /** 渲染控件（Form.Item 内） */
  control: ReactNode;
}

export interface BFilterBarProps {
  /** 搜索关键词（受控） */
  searchKey?: string;
  /** 搜索回调 */
  onSearch?: (value: string) => void;
  /** 搜索框 placeholder */
  searchPlaceholder?: string;
  /** 常规筛选字段（始终显示） */
  filters?: FilterField[];
  /** 高级筛选字段（Drawer 内显示） */
  advancedFilters?: FilterField[];
  /** 高级筛选初始值 */
  advancedValues?: Record<string, unknown>;
  /** 高级筛选确认回调 */
  onAdvancedConfirm?: (values: Record<string, unknown>) => void;
  /** 重置回调 */
  onReset?: () => void;
  /** 右侧额外操作 */
  extra?: ReactNode;
  /** 是否可折叠（filters 多时） */
  collapsible?: boolean;
  /** 默认展开折叠项 */
  defaultExpanded?: boolean;
}

/**
 * B 端筛选栏
 * - 左侧搜索 + 常规筛选
 * - 右侧高级筛选 Drawer + 重置 + 额外操作
 * - 有筛选条件时高级筛选按钮高亮（Badge 红点）
 */
export const BFilterBar = forwardRef<HTMLDivElement, BFilterBarProps>(
  function BFilterBar(
    {
      searchKey,
      onSearch,
      searchPlaceholder = "请输入关键词搜索",
      filters = [],
      advancedFilters = [],
      advancedValues,
      onAdvancedConfirm,
      onReset,
      extra,
      collapsible = false,
      defaultExpanded = false,
    },
    ref,
  ) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [form] = Form.useForm();

    const visibleFilters = useMemo(() => {
      if (!collapsible) return filters;
      return expanded ? filters : filters.slice(0, 2);
    }, [filters, collapsible, expanded]);

    const advancedCount = useMemo(() => {
      if (!advancedValues) return 0;
      return Object.values(advancedValues).filter(
        (v) =>
          v !== undefined &&
          v !== null &&
          v !== "" &&
          !(Array.isArray(v) && v.length === 0),
      ).length;
    }, [advancedValues]);

    const handleAdvancedConfirm = async () => {
      const values = await form.validateFields();
      onAdvancedConfirm?.(values);
      setDrawerOpen(false);
    };

    return (
      <div
        ref={ref}
        className="b-filter-bar"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          flexWrap: "wrap",
          marginBottom: "var(--space-4)",
        }}
      >
        <Input
          value={searchKey}
          onChange={(e) => onSearch?.(e.target.value)}
          placeholder={searchPlaceholder}
          prefix={
            <SearchOutlined style={{ color: "var(--color-text-tertiary)" }} />
          }
          allowClear
          style={{ width: 240 }}
          onPressEnter={(e) => onSearch?.((e.target as HTMLInputElement).value)}
          aria-label="搜索"
        />

        {visibleFilters.map((field) => (
          <div
            key={field.name}
            className="b-filter-bar__field"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <label
              style={{
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-body, 14px)",
                whiteSpace: "nowrap",
              }}
            >
              {field.label}
            </label>
            {field.control}
          </div>
        ))}

        {collapsible && filters.length > 2 && (
          <Button
            type="link"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "收起筛选" : "展开筛选"}
          >
            {expanded ? <UpOutlined /> : <DownOutlined />}
            {expanded ? "收起" : "展开"}
          </Button>
        )}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          {advancedFilters.length > 0 && (
            <Badge count={advancedCount} size="small" offset={[-4, 4]}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setDrawerOpen(true)}
              >
                高级筛选
              </Button>
            </Badge>
          )}
          {onReset && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onReset}
              aria-label="重置筛选"
            >
              重置
            </Button>
          )}
          {extra}
        </div>

        <Drawer
          title="高级筛选"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={400}
          extra={
            <Space>
              <Button onClick={() => setDrawerOpen(false)}>取消</Button>
              <Button type="primary" onClick={handleAdvancedConfirm}>
                确定
              </Button>
            </Space>
          }
        >
          <Form form={form} layout="vertical" initialValues={advancedValues}>
            {advancedFilters.map((field) => (
              <Form.Item key={field.name} name={field.name} label={field.label}>
                {field.control}
              </Form.Item>
            ))}
          </Form>
        </Drawer>
      </div>
    );
  },
);
