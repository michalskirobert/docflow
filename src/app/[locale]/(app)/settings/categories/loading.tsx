export default function CategoriesLoading() {
  return (
    <div
      className="categories-route-skeleton"
      aria-busy="true"
      aria-label="Loading categories"
    >
      <div className="dictionaries-page-heading page-heading">
        <div>
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
        </div>
        <span className="skeleton-action" />
      </div>
      <div className="dictionaries-page-grid">
        <section className="settings-categories-section">
          <div className="dictionary-group">
            <span className="skeleton-line short" />
            <span className="skeleton-line wide" />
            <div className="dictionary-system-chips categories-skeleton-chips">
              {Array.from({ length: 7 }).map((_, index) => (
                <span
                  className="dictionary-system-chip skeleton-category-chip"
                  key={index}
                />
              ))}
            </div>
          </div>
          <div className="dictionary-group">
            <span className="skeleton-line short" />
            <span className="skeleton-line wide" />
            <span className="skeleton-line" />
          </div>
        </section>
      </div>
    </div>
  );
}
