import {
  FormFieldSkeleton,
  PageHeadingSkeleton,
  SectionHeaderSkeleton,
  SectionSkeleton,
} from "@/components/shared/skeleton";

export default function SettingsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading settings">
      <PageHeadingSkeleton />
      <div className="settings-grid preferences-grid settings-route-skeleton">
        <div className="settings-column">
          <SectionSkeleton className="settings-card settings-skeleton-language">
            <span className="skeleton-line section-title-skeleton" />
            <span className="skeleton-line section-description-skeleton" />
            <FormFieldSkeleton compact />
          </SectionSkeleton>

          <SectionSkeleton className="settings-card settings-skeleton-appearance">
            <span className="skeleton-line section-title-skeleton" />
            <span className="skeleton-line section-description-skeleton" />
            <div className="theme-options skeleton-theme-options">
              {[0, 1, 2].map((item) => (
                <span className="skeleton-settings-option" key={item} />
              ))}
            </div>
          </SectionSkeleton>
        </div>

        <div className="settings-column">
          <SectionSkeleton className="settings-card email-settings-card settings-skeleton-email">
            <SectionHeaderSkeleton icon />
            <div className="email-settings-guide email-guide-skeleton">
              <span className="skeleton-line short" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line wide" />
              <span className="skeleton-line" />
            </div>
            <div className="email-settings-grid">
              {Array.from({ length: 6 }).map((_, item) => (
                <FormFieldSkeleton key={item} />
              ))}
            </div>
            <span className="skeleton-toggle" />
            <span className="skeleton-warning" />
            <div className="form-actions skeleton-actions">
              <span className="skeleton-action" />
            </div>
          </SectionSkeleton>
        </div>
      </div>
    </div>
  );
}
