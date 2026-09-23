export function SectionHeaderSkeleton({ icon = false }: { icon?: boolean }) {
  return (
    <div className="section-heading section-heading-skeleton" aria-hidden="true">
      {icon && <span className="skeleton-icon" />}
      <div className="section-heading-skeleton-copy">
        <span className="skeleton-line section-title-skeleton" />
        <span className="skeleton-line section-description-skeleton" />
      </div>
    </div>
  );
}
