"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useLogin } from "./service";

export default function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const login = useLogin();
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const user = await login.mutateAsync({
        email: String(f.get("email")),
        password: String(f.get("password")),
        rememberMe: f.get("rememberMe") === "on",
      });
      router.replace("/dashboard", { locale: user.locale ?? locale });
      router.refresh();
    } catch {
      setError(t("invalidCredentials"));
    }
  }
  return (
    <form onSubmit={submit} className="auth-form">
      <label className="field">
        {t("email")}
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        {t("password")}
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
        />
      </label>
      <label className="checkbox">
        <input name="rememberMe" type="checkbox" />{" "}
        <span>{t("rememberMe")}</span>
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn full" disabled={login.isPending}>
        {login.isPending ? t("signingIn") : t("signIn")}
      </button>
      <p className="auth-switch">
        {t("noAccount")} <Link href="/register">{t("createAccount")}</Link>
      </p>
    </form>
  );
}
