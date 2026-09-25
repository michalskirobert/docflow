import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
import LanguageSwitcher from "@/features/language/language-switcher";
import { DocFlowLogo } from "@/components/brand/docflow-logo";
const LoginForm = dynamic(() => import("@/features/auth/login-form"));
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (await getSession()) redirect({ href: "/dashboard", locale });
  const t = await getTranslations("auth");
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="auth-language">
          <LanguageSwitcher />
        </div>
        <DocFlowLogo className="login-brand-logo" showByline />
        <h1>{t("title")}</h1>
        <p className="muted">{t("description")}</p>
        <LoginForm />
      </section>
    </main>
  );
}
