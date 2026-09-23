import { FormFieldSkeleton, SectionSkeleton } from "@/components/shared/skeleton";

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <div className="page-heading">
        <span className="skeleton-line route-title" />
        <span className="skeleton-line route-subtitle" />
      </div>
      <div className="settings-grid preferences-grid settings-route-skeleton">
        <div className="settings-column">
          <SectionSkeleton className="settings-card settings-skeleton-language">
            <span className="skeleton-line section-title-skeleton" />
            <span className="skeleton-line section-description-skeleton" />
            <FormFieldSkeleton />
          </SectionSkeleton>
          <SectionSkeleton className="settings-card settings-skeleton-appearance">
            <span className="skeleton-line section-title-skeleton" />
            <span className="skeleton-line section-description-skeleton" />
            <div className="theme-options skeleton-theme-options">
              {[0, 1, 2].map((item) => <span className="skeleton-settings-option" key={item} />)}
            </div>
          </SectionSkeleton>
        </div>
        <div className="settings-column">
          <SectionSkeleton className="settings-card settings-skeleton-email">
            <div className="document-loading-heading settings-email-heading-skeleton">
              <span className="skeleton-icon" />
              <div>
                <span className="skeleton-line section-title-skeleton" />
                <span className="skeleton-line section-description-skeleton" />
              </div>
            </div>
            <div className="email-guide-skeleton">
              <span className="skeleton-line short" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
            <div className="email-settings-grid">
              {[0, 1, 2, 3, 4, 5].map((item) => <FormFieldSkeleton key={item} />)}
            </div>
            <span className="skeleton-toggle" />
            <span className="skeleton-warning" />
            <div className="skeleton-actions"><span className="skeleton-action" /></div>
          </SectionSkeleton>
        </div>
      </div>
    </div>
  );
}
