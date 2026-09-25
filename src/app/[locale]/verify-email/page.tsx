"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LogIn,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/axios";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/features/language/language-switcher";

type VerificationResult = {
  paymentRequired: boolean;
  paymentMethod: "PAYU" | "BANK_TRANSFER" | null;
  transferReference: string | null;
};

function VerifyEmailContent() {
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [result, setResult] = useState<VerificationResult | null>(null);

  useEffect(() => {
    const token = params.get("token");

    if (!token) {
      setState("error");
      return;
    }

    api
      .post<VerificationResult>("/auth/verify-email", { token })
      .then(({ data }) => {
        setResult(data);
        setState("ok");
      })
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
            ? result?.paymentRequired
              ? "Your account is verified. Your annual plan payment is waiting for you."
              : "Your account is ready. Sign in to start creating documents."
            : state === "error"
              ? "This verification link is invalid or has expired. Request a new link from the sign-in flow."
              : "This will only take a moment."}
        </p>

        {state === "ok" && result?.paymentRequired && (
          <div className="auth-status-actions">
            <Link className="btn full" href="/login?next=/settings">
              <CreditCard size={17} />
              Continue to payment
            </Link>
            <Link className="btn secondary full" href="/login">
              <LogIn size={17} />
              Sign in instead
            </Link>
          </div>
        )}

        {state === "ok" && !result?.paymentRequired && (
          <Link className="btn full" href="/login">
            Continue to sign in
          </Link>
        )}

        {state === "error" && (
          <Link className="btn full" href="/login">
            Back to sign in
          </Link>
        )}
      </section>
    </main>
  );
}

function VerifyEmailFallback() {
  return (
    <main className="auth-page modern-auth">
      <section className="auth-card status-card">
        <div className="status-icon loading">
          <LoaderCircle />
        </div>
        <span className="eyebrow">
          <ShieldCheck size={14} /> ACCOUNT SECURITY
        </span>
        <h1>Verifying your email…</h1>
        <p>This will only take a moment.</p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
