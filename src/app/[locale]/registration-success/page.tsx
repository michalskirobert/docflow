"use client";

import { Suspense } from "react";
import {
  CircleCheck,
  Copy,
  Landmark,
  LoaderCircle,
  LogIn,
  MailCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
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

  const copyReference = async () => {
    if (!reference) return;
    await navigator.clipboard?.writeText(reference);
  };

  return (
    <main className="auth-page modern-auth">
      <section className="auth-card registration-success-card">
        <span className="eyebrow registration-success-eyebrow">
          <CircleCheck size={15} /> {c.step}
        </span>
        <div className="registration-success-heading">
          <MailCheck size={28} aria-hidden="true" />
          <h1>{c.title}</h1>
        </div>
        <p className="registration-success-lead">
          {c.sent} <strong>{email}</strong>.
        </p>

        {bank && (
          <section className="registration-payment-panel">
            <div className="registration-payment-title">
              <Landmark size={19} aria-hidden="true" />
              <div>
                <strong>{c.pay}</strong>
                <p>{c.payInfo}</p>
              </div>
            </div>

            {reference && (
              <div className="transfer-reference-card">
                <span>{c.ref}</span>
                <div className="transfer-reference-value">
                  <code>{reference}</code>
                  <button
                    type="button"
                    onClick={copyReference}
                    aria-label={c.copyReference}
                    title={c.copyReference}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <small>{c.refHelp}</small>
              </div>
            )}

            {(recipient || account) && (
              <dl className="bank-details-list">
                {recipient && (
                  <>
                    <dt>{c.recipient}</dt>
                    <dd>{recipient}</dd>
                  </>
                )}
                {account && (
                  <>
                    <dt>{c.account}</dt>
                    <dd>{account}</dd>
                  </>
                )}
              </dl>
            )}
          </section>
        )}

        <p className="registration-success-note">{c.info}</p>
        <Link className="btn registration-success-action" href="/login">
          <LogIn size={17} /> {c.back}
        </Link>
      </section>
    </main>
  );
}

function RegistrationSuccessFallback() {
  return (
    <main className="auth-page modern-auth">
      <section className="auth-card registration-success-card registration-success-loading">
        <LoaderCircle
          className="registration-success-spinner"
          aria-hidden="true"
        />
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
