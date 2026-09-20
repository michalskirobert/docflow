export function ListSkeleton({
  rows = 4,
  cards = false,
}: {
  rows?: number;
  cards?: boolean;
}) {
  return (
    <div
      className={cards ? "skeleton-grid" : "skeleton-list"}
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div className={cards ? "skeleton-card" : "skeleton-row"} key={i}>
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
