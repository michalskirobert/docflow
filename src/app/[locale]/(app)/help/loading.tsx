import {
  FormFieldSkeleton,
  PageHeadingSkeleton,
  SectionHeaderSkeleton,
} from "@/components/shared/skeleton";

export default function HelpLoading() {
  return (
    <div aria-busy="true" aria-label="Loading help">
      <PageHeadingSkeleton />
      <div className="help-layout help-route-skeleton">
        <section className="card help-card">
          <SectionHeaderSkeleton icon />
          <div className="faq-list">
            {Array.from({ length: 7 }).map((_, index) => (
              <div className={`faq-item faq-skeleton-item${index === 0 ? " open" : ""}`} key={index}>
                <div className="faq-question">
                  <span className="skeleton-line faq-question-skeleton" />
                  <span className="skeleton-chevron" />
                </div>
                {index === 0 && (
                  <div className="faq-answer faq-answer-skeleton">
                    <span className="skeleton-line wide" />
                    <span className="skeleton-line" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card help-card support-card">
          <SectionHeaderSkeleton icon />
          <div className="support-form support-form-skeleton">
            <FormFieldSkeleton />
            <div className="form-field-skeleton textarea-field-skeleton">
              <span className="skeleton-line skeleton-label" />
              <span className="skeleton-control skeleton-textarea" />
            </div>
            <div className="form-field-skeleton">
              <span className="skeleton-line skeleton-label" />
              <div className="captcha-row">
                <span className="skeleton-control" />
                <span className="skeleton-control" />
                <span className="skeleton-control" />
              </div>
            </div>
            <span className="skeleton-line support-hint-skeleton" />
            <span className="skeleton-action support-submit-skeleton" />
          </div>
        </section>
      </div>
    </div>
  );
}
