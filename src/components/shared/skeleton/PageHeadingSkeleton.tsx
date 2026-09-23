export function PageHeadingSkeleton() {
  return (
    <div className="page-heading page-heading-skeleton" aria-hidden="true">
      <span className="skeleton-line route-title" />
      <span className="skeleton-line route-subtitle" />
    </div>
  );
}
