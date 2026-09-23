export default function NewDocumentLoading() {
  return (
    <div className="document-route-loading" aria-busy="true">
      <span className="skeleton-line document-route-title" />
      <div className="document-generator-shell document-generator-loading">
        <div
          className="document-sticky-actions document-actions-skeleton"
          aria-hidden="true"
        >
          <span className="skeleton-action" />
        </div>
        <section className="card document-form-card">
          <div className="document-loading-heading">
            <span className="skeleton-icon" />
            <div>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
          </div>
          <span className="skeleton-template-trigger" />
        </section>
      </div>
    </div>
  );
}
