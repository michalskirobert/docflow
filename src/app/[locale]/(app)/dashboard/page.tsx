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
import { getSubscriptionAccess } from "@/server/subscription/access";

export default async function DashboardPage() {
  const session = await requireSession();
  const t = await getTranslations("dashboard");

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [
    templates,
    documents,
    usedThisMonth,
    access,
    pendingPayment,
    subscription,
    organization,
  ] = await Promise.all([
    prisma.template.count({
      where: { organizationId: session.organizationId },
    }),
    prisma.document.count({
      where: { organizationId: session.organizationId },
    }),
    prisma.document.count({
      where: {
        organizationId: session.organizationId,
        createdAt: { gte: start },
      },
    }),
    getSubscriptionAccess(session),
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
    prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { name: true },
    }),
  ]);

  const limit = access.monthlyDocumentLimit;

  const remaining = limit == null ? null : Math.max(0, limit - usedThisMonth);

  const isAnnual =
    subscription?.plan === "YEARLY" && subscription.status === "ACTIVE";

  return (
    <>
      <div className="row between dashboard-heading">
        <div>
          <span className="eyebrow">WORKSPACE</span>

          <h1>{t("title")}</h1>

          <p className="muted">
            {organization?.name ?? session.organizationName}
          </p>
        </div>

        <Link href="/templates" className="btn">
          <Sparkles size={17} />
          {t("createTemplate")}
        </Link>
      </div>

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

            <span className="status-pill success">{t("active")}</span>

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
                : t("remaining", {
                    count: remaining,
                  })}
            </span>

            {limit != null && (
              <div className="usage-track">
                <span
                  style={{
                    width: `${Math.min(
                      100,
                      (usedThisMonth / Math.max(1, limit)) * 100,
                    )}%`,
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

      <div className="card quick-start">
        <span className="eyebrow">{t("quickStart")}</span>

        <h2>{t("quickTitle")}</h2>

        <p className="muted">{t("quickDescription")}</p>
      </div>
    </>
  );
}
