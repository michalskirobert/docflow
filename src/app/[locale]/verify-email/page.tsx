"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, ShieldCheck, XCircle } from "lucide-react";
import { api } from "@/lib/axios";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/features/language/language-switcher";
export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [params]);
  const Icon =
    state === "loading"
      ? LoaderCircle
      : state === "ok"
        ? CheckCircle2
        : XCircle;
  return (
    <main className="auth-page modern-auth">
      <section className="auth-card status-card">
        <div className="auth-language">
          <LanguageSwitcher />
        </div>
        <div className={`status-icon ${state}`}>
          <Icon />
        </div>
        <span className="eyebrow">
          <ShieldCheck size={14} /> ACCOUNT SECURITY
        </span>
        <h1>
          {state === "loading"
            ? "Verifying your email…"
            : state === "ok"
              ? "Email verified"
              : "Verification failed"}
        </h1>
        <p>
          {state === "ok"
            ? "Your account is ready. Sign in to start creating documents."
            : state === "error"
              ? "This verification link is invalid or has expired. Request a new link from the sign-in flow."
              : "This will only take a moment."}
        </p>
        {state !== "loading" && (
          <Link className="btn full" href="/login">
            Continue to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
