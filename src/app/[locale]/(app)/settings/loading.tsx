export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <div className="page-heading">
        <span className="skeleton-line route-title" />
        <span className="skeleton-line route-subtitle" />
      </div>
      <div className="settings-grid preferences-grid">
        <div className="settings-column">
          {[0, 1].map((item) => (
            <section className="card settings-card skeleton-card" key={item}>
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
              <span className="skeleton-line short" />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
