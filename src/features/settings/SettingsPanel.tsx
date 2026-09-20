"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AccountSettings } from "./AccountSettings";
import { PasswordSettings } from "./PasswordSettings";
import { CreditCard, FileText, ShieldAlert, Trash2 } from "lucide-react";
import { useFeedback } from "@/components/ui/feedback-provider";
import LanguageSwitcher from "@/features/language/language-switcher";
import {
  useBillingOverview,
  useChangePaymentMethod,
  useDeleteAccount,
  useStartLicensePayment,
} from "./service";
export default function SettingsPanel() {
  const t = useTranslations("settings");
  const billing = useBillingOverview();
  const remove = useDeleteAccount();
  const start = useStartLicensePayment();
  const change = useChangePaymentMethod();
  const { confirm } = useFeedback();
  const [method, setMethod] = useState<"PAYU" | "BANK_TRANSFER">("PAYU");
  const deleteAccount = async () => {
    if (
      await confirm({
        title: t("deleteAccountTitle"),
        message: t("deleteAccountMessage"),
        confirmLabel: t("deleteAccountConfirm"),
        kind: "danger",
      })
    ) {
      await remove.mutateAsync(undefined);
      window.location.href = "/";
    }
  };
  const pending =
    billing.data?.payments.filter((p) => p.status === "PENDING") ?? [];
  const runPayment = async () => {
    const current = pending[0];
    const result = current
      ? await change.mutateAsync({
          paymentId: current.id,
          paymentMethod: method,
        })
      : await start.mutateAsync({ paymentMethod: method });
    if (result.redirectUri) window.location.assign(result.redirectUri);
  };
  return (
    <div className="settings-grid">
      <AccountSettings />
      <PasswordSettings />
      <section className="card settings-card">
        <h2>{t("preferences")}</h2>
        <p className="muted">{t("preferencesHelp")}</p>
        <LanguageSwitcher />
      </section>
      <section className="card settings-card">
        <div className="section-heading">
          <CreditCard />
          <div>
            <h2>{t("licensePayments")}</h2>
            <p>{t("licensePaymentsHelp")}</p>
          </div>
        </div>
        <div className="license-summary">
          <div>
            <strong>{billing.data?.subscription?.plan ?? "FREE"}</strong>
            {billing.data?.subscription?.currentPeriodEndsAt && (
              <small className="license-expiry">
                {t("validUntil")}{" "}
                {new Date(
                  billing.data.subscription.currentPeriodEndsAt,
                ).toLocaleDateString()}{" "}
                ·{" "}
                {Math.max(
                  0,
                  Math.ceil(
                    (new Date(
                      billing.data.subscription.currentPeriodEndsAt,
                    ).getTime() -
                      Date.now()) /
                      86400000,
                  ),
                )}{" "}
                {t("daysRemaining")}
              </small>
            )}
          </div>
          <span className="status-active">
            {billing.data?.subscription?.status ?? "ACTIVE"}
          </span>
        </div>
        {billing.data?.subscription?.currentPeriodEndsAt &&
          new Date(billing.data.subscription.currentPeriodEndsAt).getTime() -
            Date.now() <=
            7 * 86400000 && (
            <div className="license-reminder">{t("licenseReminder")}</div>
          )}
        {pending.map((p) => (
          <div className="payment-row" key={p.id}>
            <div>
              <strong>
                {(p.grossAmount / 100).toFixed(2)} {p.currency}
              </strong>
              <small>
                {p.provider} · {p.transferReference || t("onlinePayment")}
              </small>
            </div>
            <span className="badge warning">{t("pending")}</span>
          </div>
        ))}
        <label className="field">
          {t("paymentMethod")}
          <select
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as "PAYU" | "BANK_TRANSFER")
            }
          >
            <option value="PAYU">PayU</option>
            <option value="BANK_TRANSFER">{t("bankTransfer")}</option>
          </select>
        </label>
        <button
          className="btn secondary"
          disabled={start.isPending || change.isPending}
          onClick={runPayment}
        >
          {pending.length ? t("continuePayment") : t("renewLicense")}
        </button>
        {(start.data?.transferReference || change.data?.transferReference) && (
          <p className="payment-reference">
            {t("transferTitle")}:{" "}
            <strong>
              {start.data?.transferReference || change.data?.transferReference}
            </strong>
          </p>
        )}
      </section>
      <section className="card settings-card">
        <div className="section-heading">
          <FileText />
          <div>
            <h2>{t("invoicesTransactions")}</h2>
            <p>{t("invoicesTransactionsHelp")}</p>
          </div>
        </div>
        {billing.data?.payments.length ? (
          billing.data.payments.map((p) => (
            <div className="payment-row" key={p.id}>
              <div>
                <strong>
                  {(p.grossAmount / 100).toFixed(2)} {p.currency}
                </strong>
                <small>
                  {new Date(p.createdAt).toLocaleDateString()} · {p.provider}
                </small>
              </div>
              <span
                className={`badge ${p.status === "COMPLETED" ? "success" : "warning"}`}
              >
                {p.status}
              </span>
            </div>
          ))
        ) : (
          <p className="muted">{t("noTransactions")}</p>
        )}
        {billing.data?.salesDocuments.map((x) => (
          <a className="invoice-row" key={x.id} href={x.fileUrl || "#"}>
            <FileText size={16} /> {t("invoice")} {x.number || x.id.slice(-6)}
          </a>
        ))}
      </section>
      <section className="card settings-card danger-zone">
        <div className="section-heading">
          <ShieldAlert />
          <div>
            <h2>{t("dangerZone")}</h2>
            <p>{t("dangerZoneHelp")}</p>
          </div>
        </div>
        <button
          className="btn danger"
          disabled={remove.isPending}
          onClick={deleteAccount}
        >
          <Trash2 size={16} /> {t("deleteAccount")}
        </button>
      </section>
    </div>
  );
}
