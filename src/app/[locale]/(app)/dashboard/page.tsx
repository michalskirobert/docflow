import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import {
  ChartNoAxesColumnIncreasing,
  FileText,
  Layers,
  ShieldCheck,
  Sparkles,
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


async function WorkspaceName() {
  const session = await requireSession();
  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true },
  });
  return <p className="muted">{organization?.name ?? session.organizationName}</p>;
}

async function DashboardContent() {
  const session = await requireSession();
  const t = await getTranslations("dashboard");

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [templates, documents, usedThisMonth, pendingPayment, subscription] =
    await Promise.all([
      prisma.template.count({ where: { organizationId: session.organizationId } }),
      prisma.document.count({ where: { organizationId: session.organizationId } }),
      prisma.document.count({
        where: {
          organizationId: session.organizationId,
          createdAt: { gte: start },
        },
      }),
      prisma.payment.findFirst({
        where: {
          organizationId: session.organizationId,
          status: "PENDING",
          plan: "YEARLY",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscription.findUnique({
        where: { organizationId: session.organizationId },
      }),
    ]);

  const limit = subscription?.monthlyDocumentLimit ?? null;
  const remaining = limit == null ? null : Math.max(0, limit - usedThisMonth);
  const isAnnual =
    subscription?.plan === "YEARLY" && subscription.status === "ACTIVE";

  return (
    <>
      <div className="grid dashboard-stats">
        <Link href="/templates" className="card stat-card stat-card-link">
          <div className="stat-card-icon"><Layers size={20} /></div>
          <div><b>{t("templates")}</b><h2>{templates}</h2></div>
        </Link>
        <Link href="/documents" className="card stat-card stat-card-link">
          <div className="stat-card-icon"><FileText size={20} /></div>
          <div><b>{t("documents")}</b><h2>{documents}</h2></div>
        </Link>
        <div className="card stat-card license-card active">
          <div className="stat-card-icon stat-card-icon-success"><ShieldCheck size={20} /></div>
          <div>
            <b>{t("license")}</b>
            <h2>{isAnnual ? t("annualLicense") : t("freeLicense")}</h2>
            <span className="status-pill success">{t("active")}</span>
            {subscription?.currentPeriodEndsAt && (
              <div className="muted">{t("validUntil", { date: subscription.currentPeriodEndsAt.toLocaleDateString() })}</div>
            )}
            {pendingPayment && <div className="payment-review">{t("paymentVerification")}</div>}
          </div>
        </div>
        <div className="card stat-card usage-card">
          <div className="stat-card-icon"><ChartNoAxesColumnIncreasing size={20} /></div>
          <div>
            <b>{t("monthlyUsage")}</b>
            <h2>{usedThisMonth}{limit != null ? ` / ${limit}` : ""}</h2>
            <span className="muted">{remaining == null ? t("unlimited") : t("remaining", { count: remaining })}</span>
            {limit != null && (
              <div className="usage-track"><span style={{ width: `${Math.min(100, (usedThisMonth / Math.max(1, limit)) * 100)}%` }} /></div>
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
      <div className="card quick-start">
        <span className="eyebrow">{t("quickStart")}</span>
        <h2>{t("quickTitle")}</h2>
        <p className="muted">{t("quickDescription")}</p>
      </div>
    </>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const t = await getTranslations("dashboard");

  return (
    <>
      <div className="row between dashboard-heading">
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <h1>{t("title")}</h1>
          <Suspense fallback={<span className="skeleton-line short" />}><WorkspaceName /></Suspense>
        </div>
        <Link href="/templates" className="btn"><Sparkles size={17} />{t("createTemplate")}</Link>
      </div>
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
