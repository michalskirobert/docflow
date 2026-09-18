"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/types/auth";
import { useCaptcha, useRegister } from "./service";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const captcha = useCaptcha();
  const register = useRegister();
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (!captcha.data) return;
    try {
      const user = await register.mutateAsync({
        name: String(f.get("name")),
        organizationName: String(f.get("organizationName")),
        email: String(f.get("email")),
        password: String(f.get("password")),
        confirmPassword: String(f.get("confirmPassword")),
        locale,
        captchaToken: captcha.data.token,
        captchaAnswer: String(f.get("captchaAnswer")),
      });
      router.replace("/dashboard", { locale: user.locale ?? locale });
      router.refresh();
    } catch {
      setError(t("registrationFailed"));
      await captcha.refetch();
    }
  }
  return (
    <form onSubmit={submit} className="auth-form">
      <div className="form-grid">
        <label className="field">
          {t("name")}
          <input name="name" required minLength={2} autoComplete="name" />
        </label>
        <label className="field">
          {t("organization")}
          <input name="organizationName" required minLength={2} />
        </label>
      </div>
      <label className="field">
        {t("email")}
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <div className="form-grid">
        <label className="field">
          {t("password")}
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          {t("confirmPassword")}
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </label>
      </div>
      <p className="hint">{t("passwordHint")}</p>
      <div className="captcha-box">
        <div>
          <strong>{t("verification")}</strong>
          <p>
            {captcha.isLoading ? t("loadingCaptcha") : captcha.data?.question}
          </p>
        </div>
        <button
          type="button"
          className="btn secondary"
          onClick={() => captcha.refetch()}
        >
          {t("newChallenge")}
        </button>
      </div>
      <label className="field">
        {t("answer")}
        <input name="captchaAnswer" inputMode="numeric" required />
      </label>
      {error && <p className="error">{error}</p>}
      <button
        className="btn full"
        disabled={register.isPending || !captcha.data}
      >
        {register.isPending ? t("creatingAccount") : t("register")}
      </button>
      <p className="auth-switch">
        {t("hasAccount")} <Link href="/login">{t("signIn")}</Link>
      </p>
    </form>
  );
}
