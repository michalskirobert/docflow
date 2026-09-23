export function FormFieldSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="form-field-skeleton" aria-hidden="true">
      <span className="skeleton-line skeleton-label" />
      <span className={`skeleton-control${compact ? " compact" : ""}`} />
    </div>
  );
}
