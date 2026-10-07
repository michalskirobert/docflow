export default function AuthRouteLoading() {
  return (
    <main className="login-page">
      <section className="login-card auth-route-skeleton" aria-busy="true">
        <div className="auth-language">
          <span className="skeleton-action" />
        </div>
        <div className="login-brand-logo auth-brand-skeleton">
          <span className="skeleton-icon" />
          <span className="skeleton-line short" />
        </div>
        <span className="skeleton-line wide" />
        <span className="skeleton-line" />
        <div className="auth-form">
          <div className="form-field-skeleton">
            <span className="skeleton-line skeleton-label" />
            <span className="skeleton-control" />
          </div>
          <div className="form-field-skeleton">
            <span className="skeleton-line skeleton-label" />
            <span className="skeleton-control" />
          </div>
          <span className="skeleton-action auth-submit-skeleton" />
        </div>
      </section>
    </main>
  );
}
