export default function RegisterLoading() {
  return (
    <main className="login-page">
      <div className="auth-shell auth-shell-wide">
        <section
          className="login-card wide auth-route-skeleton register-route-skeleton"
          aria-busy="true"
          aria-label="Loading registration form"
        >
          <div className="auth-language">
            <span className="skeleton-action" />
          </div>

          <div className="login-brand-logo auth-brand-skeleton">
            <span className="skeleton-icon" />
            <span className="skeleton-line short" />
          </div>

          <span className="skeleton-line register-title-skeleton" />
          <span className="skeleton-line register-copy-skeleton" />

          <div className="register-fields-skeleton">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="form-field-skeleton" key={index}>
                <span className="skeleton-line skeleton-label" />
                <span className="skeleton-control" />
              </div>
            ))}
          </div>

          <div className="register-section-skeleton">
            <span className="skeleton-line register-section-title-skeleton" />
            <div className="register-plan-skeleton-grid">
              <div className="register-plan-skeleton">
                <span className="skeleton-icon" />
                <div>
                  <span className="skeleton-line plan-title-skeleton" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line plan-price-skeleton" />
                  <span className="skeleton-line plan-details-skeleton" />
                </div>
              </div>
              <div className="register-plan-skeleton">
                <span className="skeleton-icon" />
                <div>
                  <span className="skeleton-line plan-title-skeleton" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line plan-price-skeleton" />
                  <span className="skeleton-line plan-details-skeleton" />
                </div>
              </div>
            </div>
          </div>

          <div className="register-fields-skeleton">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="form-field-skeleton" key={index}>
                <span className="skeleton-line skeleton-label" />
                <span className="skeleton-control" />
              </div>
            ))}
          </div>

          <span className="skeleton-action auth-submit-skeleton" />
        </section>
      </div>
    </main>
  );
}
