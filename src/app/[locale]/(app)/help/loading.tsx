export default function HelpLoading() {
  return (
    <div aria-busy="true" aria-label="Loading help">
      <div className="page-heading">
        <span className="skeleton-line route-title" />
        <span className="skeleton-line route-subtitle" />
      </div>
      <div className="help-layout">
        {[0, 1].map((card) => (
          <section className="card help-card skeleton-card" key={card}>
            <span className="skeleton-line wide" />
            <span className="skeleton-line" />
            <span className="skeleton-line" />
            <span className="skeleton-line short" />
          </section>
        ))}
      </div>
    </div>
  );
}
