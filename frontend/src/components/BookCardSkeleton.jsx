export function BookCardSkeleton({ view = "grid" }) {
  if (view === "list") {
    return (
      <div className="skeleton-row">
        <div className="skeleton skeleton-row-cover" />
        <div className="skeleton-row-body">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line" />
        </div>
      </div>
    );
  }

  return (
    <div className="card skeleton-card">
      <div className="skeleton skeleton-cover" />
      <div className="skeleton-body">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
      </div>
    </div>
  );
}

export function BookCardSkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-3">
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} view="grid" />
      ))}
    </div>
  );
}

export function BookCardSkeletonList({ count = 4 }) {
  return (
    <div className="book-list-view">
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} view="list" />
      ))}
    </div>
  );
}