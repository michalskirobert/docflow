import { ListSkeleton } from "@/components/ui/list-skeleton";
export default function Loading() {
  return (
    <div aria-busy="true">
      <div className="skeleton-line wide" />
      <div className="card skeleton-card">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
