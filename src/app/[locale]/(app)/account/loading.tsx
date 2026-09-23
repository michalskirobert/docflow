import {
  FormFieldSkeleton,
  PageHeadingSkeleton,
  SectionHeaderSkeleton,
} from "@/components/shared/skeleton";

function AccountCardSkeleton() {
  return (
    <section className="card settings-card account-route-card-skeleton">
      <span className="skeleton-line section-title-skeleton" />
      <span className="skeleton-line section-description-skeleton" />
      <div className="form-grid account-details-grid account-form-skeleton">
        {Array.from({ length: 14 }).map((_, index) => (
          <FormFieldSkeleton key={index} />
        ))}
      </div>
      <span className="skeleton-action" />
      <div className="account-security-divider" />
      <SectionHeaderSkeleton />
      <div className="account-password-skeleton">
        <FormFieldSkeleton />
        <FormFieldSkeleton />
        <FormFieldSkeleton />
      </div>
      <span className="skeleton-action" />
    </section>
  );
}

function BillingCardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <section className="card settings-card account-billing-skeleton">
      <SectionHeaderSkeleton icon />
      {Array.from({ length: rows }).map((_, index) => (
        <div className="payment-row payment-row-skeleton" key={index}>
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

export default function AccountLoading() {
  return (
    <div aria-busy="true" aria-label="Loading account">
      <PageHeadingSkeleton />
      <div className="settings-grid account-route-skeleton">
        <div className="settings-column">
          <AccountCardSkeleton />
        </div>
        <div className="settings-column">
          <BillingCardSkeleton rows={3} />
          <BillingCardSkeleton rows={3} />
          <BillingCardSkeleton rows={1} />
        </div>
      </div>
    </div>
  );
}
