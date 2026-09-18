import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
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
        <div className="login-brand">DocFlow</div>
        <p className="brand-by">by NurByte</p>
        <h1>{t("registerTitle")}</h1>
        <p className="muted">{t("registerDescription")}</p>
        <RegisterForm />
      </section>
    </main>
  );
}
