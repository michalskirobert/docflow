import {
  FormFieldSkeleton,
  PageHeadingSkeleton,
  SectionHeaderSkeleton,
} from "@/components/shared/skeleton";

function AccountDetailsSkeleton() {
  return (
    <section className="card settings-card account-route-card-skeleton">
      <span className="skeleton-line section-title-skeleton" />
      <span className="skeleton-line section-description-skeleton" />
      <div className="form-grid account-details-grid account-form-skeleton">
        {Array.from({ length: 10 }).map((_, index) => (
          <FormFieldSkeleton key={index} />
        ))}
      </div>
      <span className="skeleton-action account-save-skeleton" />
    </section>
  );
}

function PasswordSkeleton() {
  return (
    <section className="card settings-card account-password-card-skeleton">
      <span className="skeleton-line section-title-skeleton" />
      <span className="skeleton-line section-description-skeleton" />
      <div className="account-password-skeleton">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <span className="skeleton-action" />
    </section>
  );
}

function LicenseSkeleton() {
  return (
    <section className="card settings-card account-billing-skeleton">
      <SectionHeaderSkeleton icon />
      <div className="license-summary payment-row-skeleton">
        <div>
          <span className="skeleton-line short" />
          <span className="skeleton-line wide" />
        </div>
        <span className="skeleton-pill" />
      </div>
      <div className="settings-plan-section">
        <span className="skeleton-line short" />
        <span className="skeleton-line wide" />
        <div className="plan-grid settings-plan-grid skeleton-plan-grid">
          <span className="skeleton-settings-option" />
          <span className="skeleton-settings-option" />
        </div>
      </div>
    </section>
  );
}
function TransactionsSkeleton() {
  return (
    <section className="card settings-card account-billing-skeleton">
      <SectionHeaderSkeleton icon />
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="payment-row payment-row-skeleton" key={i}>
          <div>
            <span className="skeleton-line short" />
            <span className="skeleton-line wide" />
          </div>
          <span className="skeleton-pill" />
        </div>
      ))}
    </section>
  );
}
function DangerSkeleton() {
  return (
    <section className="card settings-card account-danger-skeleton">
      <SectionHeaderSkeleton icon />
      <span className="skeleton-action danger-action-skeleton" />
    </section>
  );
}
export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-label="Loading account">
      <PageHeadingSkeleton />
      <div className="settings-grid account-route-skeleton">
        <div className="settings-column">
          <AccountDetailsSkeleton />
          <PasswordSkeleton />
        </div>
        <div className="settings-column">
          <LicenseSkeleton />
          <TransactionsSkeleton />
          <DangerSkeleton />
        </div>
      </div>
    </div>
  );
}
