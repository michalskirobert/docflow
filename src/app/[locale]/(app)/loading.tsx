export default function AppLoading() {
  return (
    <div
      className="app-route-skeleton"
      aria-busy="true"
      aria-label="Loading page"
    >
      <span className="skeleton-line route-title" />
      <span className="skeleton-line route-subtitle" />
      <div className="route-transition-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <span className="skeleton-card route-card" key={index} />
        ))}
      </div>
    </div>
  );
}
