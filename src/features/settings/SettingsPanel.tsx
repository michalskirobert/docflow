"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  Download,
  FileText,
  LoaderCircle,
  ShieldAlert,
  TriangleAlert,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectControl } from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { AccountSettings } from "./AccountSettings";
import { PasswordSettings } from "./PasswordSettings";
import {
  useAccountDetails,
  useBillingOverview,
  usePublicPlans,
  useCancelLicensePayment,
  useChangePaymentMethod,
  useDeleteAccount,
  useStartLicensePayment,
} from "./service";

function SettingsCardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="settings-card-skeleton" aria-busy="true">
      <div className="skeleton-line wide" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          className={`skeleton-line ${index === rows - 1 ? "short" : ""}`.trim()}
          key={index}
        />
      ))}
    </div>
  );
}

export default function SettingsPanel() {
  const t = useTranslations("settings");
  const billing = useBillingOverview();
  const account = useAccountDetails();
  const plans = usePublicPlans(
    account.data?.customerType ?? "INDIVIDUAL",
    account.data?.countryCode ?? "PL",
  );
  const remove = useDeleteAccount();
  const start = useStartLicensePayment();
  const change = useChangePaymentMethod();
  const { confirm, notify } = useFeedback();
  const [method, setMethod] = useState<"PAYU" | "BANK_TRANSFER">("PAYU");
  const currentPlan: "FREE" | "YEARLY" =
    billing.data?.subscription?.plan === "YEARLY" ? "YEARLY" : "FREE";
  const periodEndsAt = billing.data?.subscription?.currentPeriodEndsAt
    ? new Date(billing.data.subscription.currentPeriodEndsAt).getTime()
    : null;
  const isExpired =
    currentPlan === "YEARLY" &&
    periodEndsAt !== null &&
    periodEndsAt < Date.now();
  const effectivePlan: "FREE" | "YEARLY" = isExpired ? "FREE" : currentPlan;
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "YEARLY">("FREE");
  const effectiveSelectedPlan =
    effectivePlan === "YEARLY" ? "YEARLY" : selectedPlan;

  useEffect(() => {
    if (isExpired) {
      setSelectedPlan("FREE");
      return;
    }
    if (account.data?.customerType === "BUSINESS" && effectivePlan === "FREE") {
      setSelectedPlan("YEARLY");
    }
  }, [account.data?.customerType, effectivePlan, isExpired]);

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
    billing.data?.payments.filter((payment) => payment.status === "PENDING") ??
    [];
  const currentPending = pending[0];
  const cancelPayment = useCancelLicensePayment(
    currentPending?.id ?? "missing",
  );
  const isRenewalWindow =
    currentPlan === "YEARLY" &&
    periodEndsAt !== null &&
    (billing.data?.renewalAvailable ??
      periodEndsAt - Date.now() <= 30 * 86400000);
  const daysUntilExpiry =
    periodEndsAt === null
      ? null
      : Math.ceil((periodEndsAt - Date.now()) / 86400000);
  const paymentBusy =
    start.isPending || change.isPending || cancelPayment.isPending;
  const showPurchaseControls = effectivePlan === "FREE" || isRenewalWindow;

  const payNow = async () => {
    if (currentPending) return;
    if (effectivePlan === "YEARLY" && !isRenewalWindow) return;
    try {
      const result = await start.mutateAsync({ paymentMethod: method });
      if (result.redirectUri) window.location.assign(result.redirectUri);
    } catch {
      notify(t("paymentStartError"), "error");
    }
  };

  return (
    <div className="settings-grid">
      <div className="settings-column">
        <AccountSettings />
        <PasswordSettings />
      </div>

      <div className="settings-column">
        <section className="card settings-card">
          {(billing.isPending && !billing.data) ||
          (plans.isPending && !plans.data) ? (
            <SettingsCardSkeleton rows={4} />
          ) : (
            <>
              <div className="section-heading">
                <CreditCard />
                <div>
                  <h2>{t("licensePayments")}</h2>
                  <p>{t("licensePaymentsHelp")}</p>
                </div>
              </div>

              <div className="license-summary">
                <div>
                  <strong>{effectivePlan}</strong>
                  {!isExpired &&
                    billing.data?.subscription?.currentPeriodEndsAt && (
                      <small className="license-expiry">
                        {t("validUntil")}{" "}
                        {new Date(
                          billing.data.subscription.currentPeriodEndsAt,
                        ).toLocaleDateString()}{" "}
                        ·{" "}
                        {isExpired
                          ? t("expired")
                          : daysUntilExpiry === 0
                            ? t("expiresToday")
                            : `${daysUntilExpiry ?? 0} ${t("daysRemaining")}`}
                      </small>
                    )}
                </div>
                <StatusBadge
                  status={
                    isExpired
                      ? "EXPIRED"
                      : (billing.data?.subscription?.status ?? "ACTIVE")
                  }
                  label={
                    isExpired
                      ? t("expired")
                      : isRenewalWindow && daysUntilExpiry !== null
                        ? daysUntilExpiry === 0
                          ? t("activeExpiresToday")
                          : t("activeDaysLeft", { count: daysUntilExpiry })
                        : undefined
                  }
                />
              </div>

              {billing.data?.subscription?.currentPeriodEndsAt &&
                new Date(
                  billing.data.subscription.currentPeriodEndsAt,
                ).getTime() -
                  Date.now() <=
                  7 * 86400000 && (
                  <div className="license-reminder" role="status">
                    <span className="license-reminder-icon" aria-hidden="true">
                      <TriangleAlert size={18} />
                    </span>
                    <div>
                      <strong>
                        {isExpired
                          ? t("licenseExpiredTitle")
                          : daysUntilExpiry === 0
                            ? t("licenseExpiresTodayTitle")
                            : t("licenseReminderTitle", {
                                count: daysUntilExpiry ?? 0,
                              })}
                      </strong>
                      <p>
                        {isExpired
                          ? t("licenseExpiredDescription")
                          : daysUntilExpiry === 0
                            ? t("licenseExpiresTodayDescription")
                            : t("licenseReminderDescription", {
                                count: daysUntilExpiry ?? 0,
                              })}
                      </p>
                    </div>
                  </div>
                )}

              {pending.map((payment) => (
                <div className="payment-row" key={payment.id}>
                  <div>
                    <strong>
                      {(payment.grossAmount / 100).toFixed(2)}{" "}
                      {payment.currency}
                    </strong>
                    <small>
                      {payment.provider} ·{" "}
                      {payment.transferReference || t("onlinePayment")}
                    </small>
                  </div>
                  <div className="payment-row-actions">
                    <StatusBadge status="PENDING" label={t("pending")} />
                    <button
                      type="button"
                      className="btn secondary compact"
                      disabled={paymentBusy}
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: t("cancelPaymentTitle"),
                            message: t("cancelPaymentMessage"),
                            confirmLabel: t("cancelPayment"),
                            kind: "danger",
                          }))
                        )
                          return;
                        try {
                          await cancelPayment.mutateAsync(undefined);
                          notify(t("paymentCanceled"), "success");
                        } catch {
                          notify(t("paymentCancelError"), "error");
                        }
                      }}
                    >
                      {cancelPayment.isPending && (
                        <LoaderCircle className="spinner" size={15} />
                      )}
                      {t("cancelPayment")}
                    </button>
                  </div>
                </div>
              ))}

              {showPurchaseControls && (
                <>
                  <div className="settings-plan-section">
                    <div className="settings-plan-heading">
                      <strong>{t("choosePlan")}</strong>
                      <small>{t("choosePlanHelp")}</small>
                    </div>

                    <div className="plan-grid settings-plan-grid">
                      {plans.data?.map((plan) => (
                        <button
                          type="button"
                          key={plan.code}
                          className={`plan-card settings-plan-card ${effectiveSelectedPlan === plan.code ? "selected" : ""}`}
                          disabled={
                            !plan.available ||
                            !plan.paymentAvailable ||
                            (effectivePlan === "YEARLY" && plan.code === "FREE")
                          }
                          onClick={() => setSelectedPlan(plan.code)}
                        >
                          <div className="plan-visual" aria-hidden="true">
                            <span>{plan.code === "FREE" ? "✦" : "◆"}</span>
                          </div>
                          <div className="plan-check">✓</div>
                          <strong className="plan-name">
                            {plan.code === "FREE"
                              ? t("freeLicense")
                              : t("annualLicense")}
                          </strong>
                          <small className="plan-copy">
                            {plan.code === "FREE"
                              ? t("freeLicenseCopy")
                              : t("annualLicenseCopy")}
                          </small>
                          <span className="settings-plan-price">
                            {(plan.displayAmount / 100).toLocaleString(
                              undefined,
                              {
                                style: "currency",
                                currency: plan.currency,
                              },
                            )}{" "}
                            {plan.displayNet ? t("net") : t("gross")}
                          </span>
                          {plan.code !== "FREE" && (
                            <small>
                              {plan.displayNet
                                ? `+ ${plan.vatRate}% VAT`
                                : t("vatIncluded")}
                            </small>
                          )}
                          <small>
                            {plan.documentLimit} {t("documentsPerMonth")}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>

                  {effectiveSelectedPlan === "YEARLY" && (
                    <>
                      <label className="field">
                        {t("paymentMethod")}
                        <SelectControl
                          value={method}
                          disabled={paymentBusy || Boolean(currentPending)}
                          onChange={(event) =>
                            setMethod(
                              event.target.value as "PAYU" | "BANK_TRANSFER",
                            )
                          }
                        >
                          <option value="PAYU">PayU</option>
                          <option value="BANK_TRANSFER">
                            {t("bankTransfer")}
                          </option>
                        </SelectControl>
                      </label>
                      {!currentPending && (
                        <div className="settings-payment-actions">
                          <button
                            className="btn"
                            disabled={
                              paymentBusy ||
                              (effectivePlan === "YEARLY" && !isRenewalWindow)
                            }
                            onClick={payNow}
                          >
                            {start.isPending && (
                              <LoaderCircle className="spinner" size={17} />
                            )}
                            {effectivePlan === "YEARLY"
                              ? t("renewNow")
                              : t("payNow")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {(start.data?.transferReference ||
                change.data?.transferReference) && (
                <p className="payment-reference">
                  {t("transferTitle")}:{" "}
                  <strong>
                    {start.data?.transferReference ||
                      change.data?.transferReference}
                  </strong>
                </p>
              )}
            </>
          )}
        </section>

        <section className="card settings-card">
          {billing.isPending && !billing.data ? (
            <SettingsCardSkeleton rows={3} />
          ) : (
            <>
              <div className="section-heading">
                <CreditCard />
                <div>
                  <h2>{t("transactions")}</h2>
                  <p>{t("transactionsHelp")}</p>
                </div>
              </div>

              {billing.data?.payments.length ? (
                <div className="transactions-list">
                  {billing.data.payments.map((payment) => (
                    <div className="payment-row" key={payment.id}>
                      <div>
                        <strong>
                          {(payment.grossAmount / 100).toFixed(2)}{" "}
                          {payment.currency}
                        </strong>
                        <small>
                          {new Date(payment.createdAt).toLocaleDateString()} ·{" "}
                          {payment.provider}
                        </small>
                      </div>
                      <div className="payment-row-actions">
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">{t("noTransactions")}</p>
              )}
            </>
          )}
        </section>

        <section className="card settings-card">
          {billing.isPending && !billing.data ? (
            <SettingsCardSkeleton rows={2} />
          ) : (
            <>
              <div className="section-heading">
                <FileText />
                <div>
                  <h2>{t("billingInvoices")}</h2>
                  <p>{t("billingInvoicesHelp")}</p>
                </div>
              </div>

              {billing.data?.salesDocuments.length ? (
                <div className="billing-invoice-list">
                  {billing.data.salesDocuments.map((document) => (
                    <div className="invoice-row" key={document.id}>
                      <div className="invoice-row-label">
                        <FileText size={16} />
                        <div>
                          <strong>
                            {document.type === "RECEIPT"
                              ? t("receipt")
                              : t("invoice")}{" "}
                            {document.number || document.id.slice(-6)}
                          </strong>
                          <small>
                            {new Date(document.createdAt).toLocaleDateString()}
                          </small>
                        </div>
                      </div>
                      {document.fileUrl ? (
                        <a
                          className="btn secondary compact"
                          href={`/api/billing/invoices/${document.id}/download`}
                        >
                          {t("downloadInvoice")}
                        </a>
                      ) : (
                        <span className="muted billing-invoice-pending">
                          {t("invoiceFilePending")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="billing-invoices-empty">
                  <FileText size={22} />
                  <div>
                    <strong>{t("noBillingInvoices")}</strong>
                    <small>{t("noBillingInvoicesHelp")}</small>
                  </div>
                </div>
              )}
            </>
          )}
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
    </div>
  );
}
