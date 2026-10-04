import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  ChartNoAxesColumnIncreasing,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
  Mail,
  FilePlus2,
  Calculator,
  TriangleAlert,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

function DashboardStatsSkeleton() {
  return (
    <div className="dashboard-inline-skeleton" aria-busy="true">
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

async function DashboardContent() {
  const session = await requireSession();
  const organizationId = session.organizationId;
  const t = await getTranslations("dashboard");

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const pendingVisibleSince = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const [templates, documents, usedThisMonth, pendingPayment, subscription] =
    await Promise.all([
      prisma.template.count({
        where: { organizationId: organizationId },
      }),
      prisma.document.count({
        where: { organizationId: organizationId },
      }),
      prisma.document.count({
        where: {
          organizationId: organizationId,
          createdAt: { gte: start },
        },
      }),
      prisma.payment.findFirst({
        where: {
          organizationId: organizationId,
          status: "PENDING",
          plan: "YEARLY",
          createdAt: { gte: pendingVisibleSince },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findUnique({
        where: { organizationId: organizationId },
      }),
    ]);

  const limit = subscription?.monthlyDocumentLimit ?? null;
  const remaining = limit == null ? null : Math.max(0, limit - usedThisMonth);
  const isAnnual =
    subscription?.plan === "YEARLY" && subscription.status === "ACTIVE";
  const daysUntilExpiry = subscription?.currentPeriodEndsAt
    ? Math.ceil(
        (subscription.currentPeriodEndsAt.getTime() - Date.now()) / 86400000,
      )
    : null;
  const showExpiryAlert =
    isAnnual && daysUntilExpiry !== null && daysUntilExpiry <= 7;

  return (
    <>
      <div className="row between dashboard-heading">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h1>{t("title")}</h1>
          <p className="muted">{session.organizationName}</p>
        </div>
        <Link href="/templates" className="btn">
          <Sparkles size={17} />
          {t("createTemplate")}
        </Link>
      </div>
      {showExpiryAlert && (
        <div className="card dashboard-license-alert" role="status">
          <TriangleAlert size={21} />
          <div>
            <strong>
              {daysUntilExpiry !== null && daysUntilExpiry > 0
                ? t("licenseExpiryTitle")
                : t("licenseExpiredTitle")}
            </strong>
            <p className="muted">
              {daysUntilExpiry !== null && daysUntilExpiry > 0
                ? t("licenseExpiryDescription", { count: daysUntilExpiry })
                : t("licenseExpiredDescription")}
            </p>
          </div>
          <Link href="/account" className="btn secondary">
            {t("renewLicense")}
          </Link>
        </div>
      )}
      <div className="grid dashboard-stats">
        <Link href="/templates" className="card stat-card stat-card-link">
          <div className="stat-card-icon">
            <Layers size={20} />
          </div>
          <div>
            <b>{t("templates")}</b>
            <h2>{templates}</h2>
          </div>
        </Link>
        <Link href="/documents" className="card stat-card stat-card-link">
          <div className="stat-card-icon">
            <FileText size={20} />
          </div>
          <div>
            <b>{t("documents")}</b>
            <h2>{documents}</h2>
          </div>
        </Link>
        <div className="card stat-card license-card active">
          <div className="stat-card-icon stat-card-icon-success">
            <ShieldCheck size={20} />
          </div>
          <div>
            <b>{t("license")}</b>
            <h2>{isAnnual ? t("annualLicense") : t("freeLicense")}</h2>
            <span
              className={`status-pill ${showExpiryAlert ? "warning" : "success"}`}
            >
              {showExpiryAlert &&
              daysUntilExpiry !== null &&
              daysUntilExpiry > 0
                ? t("daysLeft", { count: daysUntilExpiry })
                : t("active")}
            </span>
            {subscription?.currentPeriodEndsAt && (
              <div className="muted">
                {t("validUntil", {
                  date: subscription.currentPeriodEndsAt.toLocaleDateString(),
                })}
              </div>
            )}
            {pendingPayment && (
              <div className="payment-review">{t("paymentVerification")}</div>
            )}
          </div>
        </div>
        <div className="card stat-card usage-card">
          <div className="stat-card-icon">
            <ChartNoAxesColumnIncreasing size={20} />
          </div>
          <div>
            <b>{t("monthlyUsage")}</b>
            <h2>
              {usedThisMonth}
              {limit != null ? ` / ${limit}` : ""}
            </h2>
            <span className="muted">
              {remaining == null
                ? t("unlimited")
                : t("remaining", { count: remaining })}
            </span>
            {limit != null && (
              <div className="usage-track">
                <span
                  style={{
                    width: `${Math.min(100, (usedThisMonth / Math.max(1, limit)) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {pendingPayment && (
        <div className="card quick-start">
          <span className="eyebrow">{t("paymentVerification")}</span>
          <h2>{t("pendingTitle")}</h2>
          <p className="muted">{t("pendingDescription")}</p>
        </div>
      )}
      <div className="card quick-start calculated-variables-news">
        <span className="eyebrow">{t("newFeature")}</span>
        <h2>{t("calculatedVariablesTitle")}</h2>
        <p className="muted">{t("calculatedVariablesDescription")}</p>
        <code>{"{{quantity}} * {{unitPrice}}"}</code>
        <div className="quick-start-actions">
          <Link href="/help/calculations" className="btn secondary">
            <Calculator size={17} />
            {t("calculatedVariablesTutorial")}
          </Link>
        </div>
      </div>
      <div className="card quick-start quick-start-interactive">
        <span className="eyebrow">{t("quickStart")}</span>
        <h2>{t("quickTitle")}</h2>
        <p className="muted">{t("quickDescription")}</p>
        <div className="quick-start-actions">
          <Link href="/documents/new" className="btn">
            <FilePlus2 size={17} />
            {t("newDocument")}
          </Link>
          <Link href="/documents/email" className="btn secondary">
            <Mail size={17} />
            {t("prepareEmail")}
          </Link>
          <Link href="/templates" className="btn secondary">
            <Sparkles size={17} />
            {t("createTemplate")}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardPageSkeleton() {
  return (
    <div
      className="dashboard-route-skeleton"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="dashboard-heading">
        <span className="skeleton-line short" />
        <span className="skeleton-line wide" />
        <span className="skeleton-line short" />
      </div>
      <DashboardStatsSkeleton />
    </div>
  );
}
