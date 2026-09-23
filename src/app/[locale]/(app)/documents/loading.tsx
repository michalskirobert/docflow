import { ListSkeleton } from "@/components/ui/list-skeleton";

export default function DocumentsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading documents">
      <span className="skeleton-line route-title" />
      <section className="document-history">
        <div className="section-heading">
          <span
            className="skeleton-card"
            style={{ width: 36, height: 36, minHeight: 36 }}
          />
          <div style={{ flex: 1 }}>
            <span className="skeleton-line wide" />
            <span className="skeleton-line" />
          </div>
        </div>
        <div className="filter-bar">
          <span className="skeleton-line wide" />
          <span className="skeleton-line short" />
          <span className="skeleton-line short" />
        </div>
        <ListSkeleton rows={5} />
      </section>
    </div>
  );
}
