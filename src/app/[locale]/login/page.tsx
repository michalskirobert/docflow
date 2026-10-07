import type { Metadata } from "next";
import LoginForm from "@/features/auth/login-form";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";
import { DocFlowLogo } from "@/components/brand/docflow-logo";
import { AuthFooter } from "@/features/auth/auth-footer";
import { isLocale, type Locale } from "@/i18n/config";
import { publicPageMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  return publicPageMetadata(locale, "/login");
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();

  if (session) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.id,
          organizationId: session.organizationId,
        },
      },
      select: { id: true },
    });

    if (membership) {
      redirect({ href: "/dashboard", locale });
    }
  }
  const t = await getTranslations("auth");
  return (
    <main className="login-page">
      <div className="auth-shell">
        <section className="login-card">
          <DocFlowLogo className="login-brand-logo" showByline />
          <h1>{t("title")}</h1>
          <p className="muted">{t("description")}</p>
          <LoginForm />
        </section>
        <AuthFooter />
      </div>
    </main>
  );
}
