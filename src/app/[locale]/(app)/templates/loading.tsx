import { ListSkeleton } from "@/components/ui/list-skeleton";

export default function TemplatesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading templates">
      <span className="skeleton-line route-title" />
      <span className="skeleton-line route-subtitle" />
      <div className="page-actions template-list-actions">
        <span className="skeleton-line wide" />
        <span className="skeleton-line short" />
        <span className="skeleton-line short" />
      </div>
      <ListSkeleton rows={6} cards />
    </div>
  );
}
