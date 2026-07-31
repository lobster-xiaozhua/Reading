export default function SearchPagination({ page, total, perPage, onChange }) {
  const maxPage = Math.max(1, Math.ceil(total / perPage));
  if (maxPage <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(maxPage, page + 2);
  if (start > 1) pages.push(1);
  if (start > 2) pages.push("...");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < maxPage - 1) pages.push("...");
  if (end < maxPage) pages.push(maxPage);

  return (
    <div className="search-pagination">
      <button
        className="btn btn-ghost"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="上一页"
      >
        ← 上一页
      </button>
      <div className="search-pagination-pages">
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="search-pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`search-pagination-page ${p === page ? "active" : ""}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        className="btn btn-ghost"
        disabled={page >= maxPage}
        onClick={() => onChange(page + 1)}
        aria-label="下一页"
      >
        下一页 →
      </button>
      <span className="search-pagination-total">共 {total} 条</span>
    </div>
  );
}