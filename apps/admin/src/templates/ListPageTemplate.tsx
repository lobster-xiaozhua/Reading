/* ============================================================
 * P3-1 · 列表页模板 ListPageTemplate
 * PageHeader + FilterBar + Table + Pagination + BatchActionBar
 * 状态变体：空列表 / 加载中 / 加载失败 / 无权限 / 无搜索结果
 * 筛选状态同步 URL（刷新不丢失，04 §9.3）
 * Source: 04 §5.1
 * ============================================================ */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Result, Button, Space } from "antd";
import { ReloadOutlined, PlusOutlined } from "@ant-design/icons";
import { useSearchParams } from "react-router-dom";
import { BPageHeader } from "@novel/b-end";
import type { BPageHeaderProps } from "@novel/b-end";
import { BFilterBar } from "@novel/b-end";
import type { FilterField } from "@novel/b-end";
import { BTable } from "@novel/b-end";
import type { BTableProps } from "@novel/b-end";
import { CompactTable } from "@novel/b-end";
import { BBatchActionBar } from "@novel/b-end";
import type { BatchAction } from "@novel/b-end";
import { useAuthStore } from "@/stores/authStore";

/** 异步状态：统一管理列表页状态变体 */
export type ListPageStatus =
  "idle" | "loading" | "empty" | "error" | "no-permission" | "no-search-result";

export interface ListPageTemplateProps<T> {
  /** 页面标题 */
  title: string;
  /** 面包屑 */
  breadcrumb?: BPageHeaderProps["breadcrumb"];
  /** 所需权限点（无权限时显示 403） */
  permission?: string;
  /** 数据加载状态 */
  status: ListPageStatus;
  /** 加载失败时的重试回调 */
  onRetry?: () => void;
  /** 返回回调 */
  onBack?: BPageHeaderProps["onBack"];

  /* ---------- FilterBar ---------- */
  /** 搜索关键词（受控，从 URL 同步） */
  searchKey: string;
  /** 搜索回调 */
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  /** 常规筛选字段 */
  filters?: FilterField[];
  /** 高级筛选字段 */
  advancedFilters?: FilterField[];
  /** 高级筛选当前值 */
  advancedValues?: Record<string, unknown>;
  /** 高级筛选确认 */
  onAdvancedConfirm?: (values: Record<string, unknown>) => void;
  /** 重置 */
  onReset?: () => void;

  /* ---------- Table ---------- */
  columns: BTableProps<T>["columns"];
  dataSource: T[];
  rowKey: BTableProps<T>["rowKey"];
  loading?: boolean;
  /** 分页 */
  pagination?: BTableProps<T>["pagination"];
  /** 分页变化回调 */
  onPaginationChange?: (page: number, pageSize: number) => void;
  /** 行选择 */
  rowSelection?: BTableProps<T>["rowSelection"];
  /** 已选行数 */
  selectedCount?: number;

  /* ---------- BatchActionBar ---------- */
  /** 批量操作 */
  batchActions?: BatchAction[];
  /** 清除选择 */
  onClearSelection?: () => void;

  /** 是否使用紧凑型表格（默认 false） */
  compact?: boolean;
  /** 表格密度（默认 small，与其他页面一致） */
  size?: "small" | "middle" | "large";
  /** 表格横向滚动配置（列宽较大时用于启用固定列） */
  scroll?: BTableProps<T>["scroll"];

  /* ---------- PageHeader extra ---------- */
  /** 新建按钮回调（不传则不显示） */
  onCreate?: () => void;
  /** 是否有新建权限 */
  canCreate?: boolean;
}

/**
 * B 端列表页模板
 * - 5 状态变体统一渲染
 * - 筛选状态同步 URL
 */
export function ListPageTemplate<T extends object>(
  props: ListPageTemplateProps<T>,
) {
  const {
    title,
    breadcrumb,
    permission,
    status,
    onRetry,
    onBack,
    searchKey,
    onSearch,
    searchPlaceholder,
    filters,
    advancedFilters,
    advancedValues,
    onAdvancedConfirm,
    onReset,
    columns,
    dataSource,
    rowKey,
    loading,
    pagination,
    onPaginationChange,
    rowSelection,
    selectedCount = 0,
    compact = false,
    size = "small",
    scroll,
    batchActions,
    onClearSelection,
    onCreate,
    canCreate = true,
  } = props;

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // 筛选状态同步 URL：searchKey 变化时写 URL
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (current !== searchKey) {
      const next = new URLSearchParams(searchParams);
      if (searchKey) next.set("q", searchKey);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }
    // searchParams omitted: adding it would re-trigger when URL is updated by this effect
    // setSearchParams is stable from useSearchParams
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, setSearchParams]);

  // 初始化时从 URL 读 searchKey
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && q !== searchKey) onSearch(q);
    // mount-only: read initial URL params into parent state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePaginationChange = useCallback(
    (page: number, pageSize: number) => {
      onPaginationChange?.(page, pageSize);
      const next = new URLSearchParams(searchParams);
      next.set("page", String(page));
      next.set("size", String(pageSize));
      setSearchParams(next, { replace: true });
    },
    [onPaginationChange, searchParams, setSearchParams],
  );

  const pageHeaderExtra = useMemo(() => {
    if (!onCreate || !canCreate) return undefined;
    return (
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        {t("common:create")}
      </Button>
    );
  }, [onCreate, canCreate, t]);

  // 无权限
  if (permission && !hasPermission(permission as any)) {
    return (
      <div>
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <div className="b-list-page__state-block">
          <Result
            status="403"
            title={t("common:noPermission")}
            subTitle={<span>{t("common:noPermissionDesc")}</span>}
            extra={
              <Space>
                <Button type="primary" onClick={onBack ?? (() => window.history.back())}>
                  {t("common:backToPrev")}
                </Button>
                <Button onClick={() => window.location.reload()}>
                  {t("common:refreshPage")}
                </Button>
              </Space>
            }
          />
        </div>
      </div>
    );
  }

  // 加载失败
  if (status === "error") {
    return (
      <div>
        <BPageHeader title={title} breadcrumb={breadcrumb} onBack={onBack} />
        <div className="b-list-page__state-block">
          <Result
            status="error"
            title={t("common:loadError")}
            subTitle={<span>{t("common:loadErrorDesc")}</span>}
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={onRetry}
                >
                  {t("common:retry")}
                </Button>
                <Button onClick={() => window.open("/charts", "_self")}>
                  {t("common:viewMonitor")}
                </Button>
              </Space>
            }
          />
        </div>
      </div>
    );
  }

  const isEmpty =
    status === "empty" || (status === "idle" && dataSource.length === 0);
  const isNoSearchResult = status === "no-search-result";

  return (
    <div className="b-list-page">
      <BPageHeader
        title={title}
        breadcrumb={breadcrumb}
        onBack={onBack}
        extra={pageHeaderExtra}
      />

      <BFilterBar
        searchKey={searchKey}
        onSearch={onSearch}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        advancedFilters={advancedFilters}
        advancedValues={advancedValues}
        onAdvancedConfirm={onAdvancedConfirm}
        onReset={onReset}
        collapsible={filters && filters.length > 4}
      />

      {compact ? (
        <CompactTable
          columns={columns as any}
          dataSource={dataSource as any}
          rowKey={rowKey}
          loading={loading ?? status === "loading"}
          pagination={
            pagination ?? {
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              showTotal: (totalCount: number) => t("common:total", { count: totalCount }),
              onChange: handlePaginationChange,
            }
          }
          rowSelection={rowSelection as any}
          locale={{
            emptyText: isNoSearchResult ? (
              <Result
                status="info"
                title={t("common:noSearchResult")}
                subTitle={t("common:noSearchResultDesc")}
                extra={onReset && <Button onClick={onReset}>{t("common:clearFilter")}</Button>}
              />
            ) : isEmpty ? (
              <Result
                status="info"
                title={t("common:empty")}
                subTitle={
                  onCreate && canCreate
                    ? t("common:emptyCreateDesc")
                    : t("common:emptyDesc")
                }
                extra={
                  onCreate && canCreate ? (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={onCreate}
                    >
                      {t("common:create")}
                    </Button>
                  ) : undefined
                }
              />
            ) : undefined,
          }}
        />
      ) : (
      <BTable
        columns={columns as any}
        dataSource={dataSource as any}
        rowKey={rowKey}
        size={size}
        scroll={scroll}
        loading={loading ?? status === "loading"}
        pagination={
          pagination ?? {
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (totalCount: number) => t("common:total", { count: totalCount }),
            onChange: handlePaginationChange,
          }
        }
        rowSelection={rowSelection as any}
        locale={{
          emptyText: isNoSearchResult ? (
            <Result
              status="info"
              title={t("common:noSearchResult")}
              subTitle={t("common:noSearchResultDesc")}
              extra={onReset && <Button onClick={onReset}>{t("common:clearFilter")}</Button>}
            />
          ) : isEmpty ? (
            <Result
              status="info"
              title={t("common:empty")}
              subTitle={
                onCreate && canCreate
                  ? t("common:emptyCreateDesc")
                  : t("common:emptyDesc")
              }
              extra={
                onCreate && canCreate ? (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onCreate}
                  >
                    {t("common:create")}
                  </Button>
                ) : undefined
              }
            />
          ) : undefined,
        }}
      />
      )}

      {batchActions && batchActions.length > 0 && (
        <BBatchActionBar
          selectedCount={selectedCount}
          actions={batchActions}
          visible={selectedCount > 0}
          onClear={onClearSelection ?? (() => {})}
        />
      )}
    </div>
  );
}
