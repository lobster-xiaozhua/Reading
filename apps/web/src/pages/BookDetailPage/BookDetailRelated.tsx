import { BookCard, EmptyState, Skeleton } from "@novel/components";
import { toBook } from "@/utils/convert";
import type { BookSummary } from "@/api/types";

interface BookDetailRelatedProps {
  related: BookSummary[];
  loading: boolean;
}

export function BookDetailRelated({
  related,
  loading,
}: BookDetailRelatedProps) {
  return (
    <section className="book-detail__related container-page">
      <h2 className="book-detail__section-title">相关推荐</h2>
      {loading && related.length === 0 ? (
        <Skeleton rows={4} />
      ) : related.length === 0 ? (
        <EmptyState title="暂无相关推荐" />
      ) : (
        <div className="book-detail__related-grid">
          {related.map((b) => (
            <BookCard key={b.id} book={toBook(b)} variant="grid" size="sm" />
          ))}
        </div>
      )}
    </section>
  );
}
