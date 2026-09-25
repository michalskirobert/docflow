import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/lib/prisma";
import LanguageSwitcher from "@/features/language/language-switcher";
import { DocFlowLogo } from "@/components/brand/docflow-logo";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
const RegisterForm = dynamic(() => import("@/features/auth/register-form"));
export default async function RegisterPage({
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
      <section className="login-card wide">
        <div className="auth-topbar">
          <Link href="/login" className="auth-back">
            <ArrowLeft size={16} /> {t("backToLogin")}
          </Link>
          <LanguageSwitcher />
        </div>
        <DocFlowLogo className="login-brand-logo" showByline />
        <h1>{t("registerTitle")}</h1>
        <p className="muted">{t("registerDescription")}</p>
        <RegisterForm />
        <p className="auth-switch auth-switch-page">
          {t("alreadyAccount")} <Link href="/login">{t("signIn")}</Link>
        </p>
      </section>
    </main>
  );
}
