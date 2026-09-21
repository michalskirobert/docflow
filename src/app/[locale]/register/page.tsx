import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import LanguageSwitcher from "@/features/language/language-switcher";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
const RegisterForm = dynamic(() => import("@/features/auth/register-form"));
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (await getSession()) redirect({ href: "/dashboard", locale });
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
        <div className="login-brand">DocFlow</div>
        <p className="brand-by">by NurByte</p>
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
