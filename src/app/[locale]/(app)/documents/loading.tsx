import { ListSkeleton } from "@/components/ui/list-skeleton";

export default function DocumentsLoading() {
  return (
    <div
      className="documents-route-skeleton"
      aria-busy="true"
      aria-label="Loading documents"
    >
      <span className="skeleton-line route-title" />
      <section className="document-history">
        <div className="section-heading">
          <span className="skeleton-icon" />
          <div>
            <span className="skeleton-line wide" />
            <span className="skeleton-line short" />
          </div>
        </div>
        <div className="list-toolbar skeleton-toolbar">
          <span className="skeleton-line wide" />
          <span className="skeleton-action" />
          <span className="skeleton-action" />
        </div>
        <ListSkeleton rows={5} />
      </section>
    </div>
  );
}
