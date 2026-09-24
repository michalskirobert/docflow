import {
  FormFieldSkeleton,
  SectionHeaderSkeleton,
} from "@/components/shared/skeleton";

export default function EmailLoading() {
  return (
    <div
      className="document-route-loading email-route-loading"
      aria-busy="true"
    >
      <span className="skeleton-line document-route-title" />
      <div className="document-generator-shell">
        <div
          className="form-actions document-sticky-actions document-actions-skeleton email-actions-loading"
          aria-hidden="true"
        >
          <span className="skeleton-action email-back-action-skeleton" />
          <div className="email-header-actions email-header-actions-skeleton">
            <span className="skeleton-action" />
            <span className="skeleton-action" />
            <span className="skeleton-action email-send-action-skeleton" />
          </div>
        </div>
        <section className="card document-form-card email-form-skeleton">
          <SectionHeaderSkeleton icon />
          <FormFieldSkeleton />
          <FormFieldSkeleton />
          <div className="email-source-note-skeleton">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          {Array.from({ length: 4 }).map((_, index) => (
            <FormFieldSkeleton key={index} />
          ))}
        </section>
      </div>
    </div>
  );
}
