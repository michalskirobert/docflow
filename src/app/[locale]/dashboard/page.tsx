import { getTranslations } from "next-intl/server";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/server/auth/session";
import { getSubscriptionAccess } from "@/server/subscription/access";

export default async function DashboardPage() {
  const session = (await getSession())!;
  const t = await getTranslations("dashboard");
  const [templates, documents, access] = await Promise.all([
    prisma.template.count({
      where: { organizationId: session.organizationId },
    }),
    prisma.document.count({
      where: { organizationId: session.organizationId },
    }),
    getSubscriptionAccess(session),
  ]);

  return (
    <AppShell>
      <h1>{t("title")}</h1>
      <p className="muted">{session.organizationName}</p>
      <div className="grid">
        <div className="card">
          <b>{t("templates")}</b>
          <h2>{templates}</h2>
        </div>
        <div className="card">
          <b>{t("documents")}</b>
          <h2>{documents}</h2>
        </div>
        <div className="card">
          <b>{t("access")}</b>
          <h2>{access.allowed ? t("enabled") : t("locked")}</h2>
          <span className="badge">{access.reason.replaceAll("_", " ")}</span>
        </div>
      </div>
    </AppShell>
  );
}
