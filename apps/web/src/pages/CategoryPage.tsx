/* ============================================================
 * P5-4 · 分类页
 * 左侧分类树 + 标签筛选 + 排序 Tab + 书籍网格 + 分页
 * URL 参数同步：?cat=玄幻&sort=hot&tag=热血,热血&status=ongoing
 * ============================================================ */
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookCard,
  EmptyState,
  Pagination,
  Skeleton,
  Tag,
  useAsyncState,
} from "@novel/components";
import { fetcher } from "@/api/fetcher";
import { toBook } from "@/utils/convert";
import type { Category, SortKey, Tag as TagType } from "@/api/types";
import "./CategoryPage.css";

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: "hot", label: "人气" },
  { key: "follow", label: "收藏" },
  { key: "latest", label: "最新" },
  { key: "completed", label: "完结" },
];

const STATUS_OPTIONS: { key: "" | "ongoing" | "completed"; label: string }[] = [
  { key: "", label: "全部" },
  { key: "ongoing", label: "连载" },
  { key: "completed", label: "完结" },
];

const PAGE_SIZE = 12;

export default function CategoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get("cat") ?? "all";
  const sort = (searchParams.get("sort") as SortKey) ?? "hot";
  const status =
    (searchParams.get("status") as "" | "ongoing" | "completed") ?? "";
  const tagParam = searchParams.get("tag") ?? "";
  const selectedTags = tagParam ? tagParam.split(",").filter(Boolean) : [];
  // 页码归一化：缺失/非法/负数 → 1，避免非法分页请求
  const rawPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  // 归一化结果与 URL 不同时回写，避免地址栏残留 ?page=0|abc
  useEffect(() => {
    const raw = searchParams.get("page");
    // page=1 时缺省或显式 "1" 均视为合法；否则必须精确等于当前页码
    const valid =
      page === 1 ? raw === null || raw === "1" : raw === String(page);
    if (!valid) {
      const next = new URLSearchParams(searchParams);
      if (page === 1) next.delete("page");
      else next.set("page", String(page));
      setSearchParams(next, { replace: true });
    }
  }, [page, searchParams, setSearchParams]);

  /* ---------- 分类 & 标签 ---------- */
  const categoriesState = useAsyncState<Category[]>(
    () => fetcher.getCategories(),
    { initial: [] as Category[], loadingDelay: 200 },
  );
  const tagsState = useAsyncState<TagType[]>(() => fetcher.getTags(), {
    initial: [] as TagType[],
    loadingDelay: 200,
  });

  /* ---------- 书籍列表 ---------- */
  const booksState = useAsyncState(
    () =>
      fetcher.getCategoryBooks({
        category: category === "all" ? undefined : category,
        tags: selectedTags,
        sort,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    {
      deps: [category, sort, status, tagParam, page],
      loadingDelay: 200,
    },
  );

  const categories = categoriesState.data ?? [];
  const tags = tagsState.data ?? [];
  const result = booksState.data;
  const books = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------- 筛选操作 ---------- */
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // 切换分类/排序/标签/状态时重置页码
    if (key !== "page") next.delete("page");
    setSearchParams(next, { replace: false });
  };

  const toggleTag = (tagName: string) => {
    const next = selectedTags.includes(tagName)
      ? selectedTags.filter((t) => t !== tagName)
      : [...selectedTags, tagName];
    updateParam("tag", next.join(","));
  };

  const handlePageChange = (p: number) => {
    updateParam("page", String(p));
    // 滚动到顶部
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // 页码超出范围时回退
  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      updateParam("page", "1");
    }
    // updateParam omitted: local function recreated on every render, adding it would cause infinite re-runs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, page]);

  const loading = booksState.loading && books.length === 0;
  const loadError = booksState.status === "error";

  return (
    <div className="category-page container-page">
      <h1 className="category-page__title">分类</h1>

      <div className="category-page__layout">
        {/* 左侧分类树 */}
        <aside className="category-page__sidebar" aria-label="分类导航">
          <h2 className="category-page__sidebar-title">分类</h2>
          <ul className="category-page__cat-list">
            <li>
              <button
                type="button"
                className={`category-page__cat-item ${category === "all" ? "is-active" : ""}`}
                onClick={() => updateParam("cat", "all")}
              >
                <span>全部分类</span>
              </button>
            </li>
            {categoriesState.loading && categories.length === 0 ? (
              <li className="category-page__sidebar-loading">
                <Skeleton rows={6} />
              </li>
            ) : (
              categories.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`category-page__cat-item ${category === c.name ? "is-active" : ""}`}
                    onClick={() => updateParam("cat", c.name)}
                  >
                    <span>{c.name}</span>
                    <span className="category-page__cat-count">{c.count}</span>
                  </button>
                  {c.children && c.children.length > 0 ? (
                    <ul className="category-page__cat-sub">
                      {c.children.map((sub) => (
                        <li key={sub.id}>
                          <button
                            type="button"
                            className={`category-page__cat-sub-item ${
                              category === sub.name ? "is-active" : ""
                            }`}
                            onClick={() => updateParam("cat", sub.name)}
                          >
                            {sub.name}
                            <span className="category-page__cat-count">
                              {sub.count}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* 右侧主区 */}
        <section className="category-page__main" aria-label="书籍列表">
          {/* 排序 + 状态 */}
          <div className="category-page__toolbar">
            <div
              className="category-page__sort-tabs"
              role="tablist"
              aria-label="排序方式"
            >
              {SORT_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={sort === t.key}
                  className={`category-page__sort-tab ${sort === t.key ? "is-active" : ""}`}
                  onClick={() => updateParam("sort", t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div
              className="category-page__status-group"
              role="group"
              aria-label="连载状态"
            >
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`category-page__status-btn ${status === s.key ? "is-active" : ""}`}
                  onClick={() => updateParam("status", s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 标签筛选 */}
          {tags.length > 0 ? (
            <div className="category-page__tags" aria-label="标签筛选">
              <span className="category-page__tags-label">标签：</span>
              <div className="category-page__tags-list">
                {tags.map((t) => {
                  const active = selectedTags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="category-page__tag-btn"
                      onClick={() => toggleTag(t.name)}
                    >
                      <Tag color={active ? "primary" : "default"}>{t.name}</Tag>
                    </button>
                  );
                })}
              </div>
              {selectedTags.length > 0 ? (
                <button
                  type="button"
                  className="category-page__tags-clear"
                  onClick={() => updateParam("tag", "")}
                >
                  清空
                </button>
              ) : null}
            </div>
          ) : null}

          {/* 结果统计 */}
          <div className="category-page__result-meta">
            共 <strong>{total}</strong> 本
            {category !== "all" ? <span>· 分类：{category}</span> : null}
            {selectedTags.length > 0 ? (
              <span>· 标签：{selectedTags.join("、")}</span>
            ) : null}
          </div>

          {/* 书籍网格 */}
          {loadError && books.length === 0 ? (
            <div className="category-page__error">
              <EmptyState
                title="加载失败"
                description="网络开小差了，请稍后重试"
                action={
                  <button
                    type="button"
                    className="category-page__reset-btn"
                    onClick={() => booksState.run()}
                  >
                    重试
                  </button>
                }
              />
            </div>
          ) : loading ? (
            <div className="category-page__grid">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <BookCard
                  key={i}
                  book={{ id: `s-${i}`, title: "", author: "" }}
                  variant="grid"
                  size="md"
                  loading
                />
              ))}
            </div>
          ) : books.length === 0 ? (
            <EmptyState
              title="没有找到匹配的书籍"
              description="试试调整筛选条件"
              action={
                <button
                  type="button"
                  className="category-page__reset-btn"
                  onClick={() =>
                    setSearchParams(new URLSearchParams(), { replace: false })
                  }
                >
                  重置筛选
                </button>
              }
            />
          ) : (
            <div className="category-page__grid">
              {books.map((b) => (
                <Link
                  key={b.id}
                  to={`/book/${b.id}`}
                  className="category-page__book-link"
                >
                  <BookCard book={toBook(b)} variant="grid" size="md" />
                </Link>
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 ? (
            <div className="category-page__pagination">
              <Pagination
                current={page}
                total={totalPages}
                showTotal
                totalItems={total}
                showJumper
                onChange={handlePageChange}
              />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
