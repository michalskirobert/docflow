"use client";

import { Suspense } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/features/language/language-switcher";
import { copy } from "./utils";

function RegistrationSuccessContent() {
  const params = useSearchParams();

  const email = params.get("email") ?? "your email";
  const bank = params.get("payment") === "bank";
  const reference = params.get("reference") ?? "";

  const locale = useLocale() as keyof typeof copy;
  const c = copy[locale] ?? copy.en;

  const recipient = process.env.NEXT_PUBLIC_BANK_TRANSFER_RECIPIENT;

  const account = process.env.NEXT_PUBLIC_BANK_TRANSFER_IBAN;

  return (
    <main className="auth-page modern-auth">
      <section className="auth-card status-card">
        <div className="auth-language">
          <LanguageSwitcher />
        </div>

        <div className="status-icon ok">
          <MailCheck />
        </div>

        <span className="eyebrow">{c.step}</span>

        <h1>{c.title}</h1>

        <p>
          {c.sent} <strong>{email}</strong>.
        </p>

        {bank && (
          <div className="payment-review bank-instructions">
            <strong>{c.pay}</strong>

            <div>{c.payInfo}</div>

            {reference && (
              <div className="transfer-reference">
                <span>{c.ref}</span>

                <code>{reference}</code>

                <small>{c.refHelp}</small>
              </div>
            )}

            {recipient && (
              <div>
                <b>{c.recipient}:</b> {recipient}
              </div>
            )}

            {account && (
              <div>
                <b>{c.account}:</b> {account}
              </div>
            )}
          </div>
        )}

        <div className="info-box">{c.info}</div>

        <Link className="btn full" href="/login">
          {c.back}
        </Link>
      </section>
    </main>
  );
}

function RegistrationSuccessFallback() {
  return (
    <main className="auth-page modern-auth">
      <section className="auth-card status-card">
        <div className="auth-language">
          <LanguageSwitcher />
        </div>

        <div className="status-icon loading">
          <LoaderCircle />
        </div>

        <p>Loading…</p>
      </section>
    </main>
  );
}

export default function RegistrationSuccessPage() {
  return (
    <Suspense fallback={<RegistrationSuccessFallback />}>
      <RegistrationSuccessContent />
    </Suspense>
  );
}
