import {
  FormFieldSkeleton,
  SectionHeaderSkeleton,
} from "@/components/shared/skeleton";

export default function EditDocumentLoading() {
  return (
    <div
      className="document-route-loading edit-document-route-loading"
      aria-busy="true"
    >
      <span className="skeleton-line document-route-title" />
      <div className="document-generator-shell pending-form">
        <div className="form-actions document-sticky-actions document-edit-actions-skeleton">
          <span className="skeleton-action" />
          <span className="skeleton-action" />
          <span className="skeleton-action" />
        </div>
        <section className="card document-form-card document-edit-form-skeleton">
          <SectionHeaderSkeleton icon />
          <FormFieldSkeleton />
          {Array.from({ length: 5 }).map((_, index) => (
            <FormFieldSkeleton key={index} />
          ))}
        </section>
      </div>
    </div>
  );
}
