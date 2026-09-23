export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-label="Loading account">
      <div className="page-heading">
        <span className="skeleton-line route-title" />
        <span className="skeleton-line route-subtitle" />
      </div>
      <div className="settings-grid">
        {[0, 1].map((column) => (
          <div className="settings-column" key={column}>
            {[0, 1].map((card) => (
              <section className="card settings-card skeleton-card" key={card}>
                <span className="skeleton-line wide" />
                <span className="skeleton-line" />
                <span className="skeleton-line short" />
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
