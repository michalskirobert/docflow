export default function DashboardLoading() {
  return (
    <div
      className="dashboard-route-skeleton"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="skeleton-line wide" />
      <div className="grid dashboard-stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="card stat-card skeleton-card" key={index}>
            <span className="skeleton-icon" />
            <div style={{ width: "100%" }}>
              <span className="skeleton-line wide" />
              <span className="skeleton-line short" />
            </div>
          </div>
        ))}
      </div>
      <div className="card skeleton-card">
        <span className="skeleton-line wide" />
        <span className="skeleton-line" />
      </div>
    </div>
  );
}
