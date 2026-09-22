"use client";

import { useEffect, useState } from "react";
import { CreditCard, FileText, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SelectControl } from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { AccountSettings } from "./AccountSettings";
import {
  useAccountDetails,
  useBillingOverview,
  usePublicPlans,
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
  const plans = usePublicPlans(account.data?.customerType ?? "INDIVIDUAL");
  const remove = useDeleteAccount();
  const start = useStartLicensePayment();
  const change = useChangePaymentMethod();
  const { confirm } = useFeedback();
  const [method, setMethod] = useState<"PAYU" | "BANK_TRANSFER">("PAYU");
  const currentPlan = billing.data?.subscription?.plan ?? "FREE";
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "YEARLY">("FREE");
  const effectiveSelectedPlan =
    currentPlan === "YEARLY" ? "YEARLY" : selectedPlan;

  useEffect(() => {
    if (account.data?.customerType === "BUSINESS" && currentPlan === "FREE") {
      setSelectedPlan("YEARLY");
    }
  }, [account.data?.customerType, currentPlan]);

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
      <div className="settings-column">
        <AccountSettings />
      </div>

      <div className="settings-column">
        <section className="card settings-card">
          {billing.isLoading ? (
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
                new Date(
                  billing.data.subscription.currentPeriodEndsAt,
                ).getTime() -
                  Date.now() <=
                  7 * 86400000 && (
                  <div className="license-reminder">{t("licenseReminder")}</div>
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
                  <span className="badge warning">{t("pending")}</span>
                </div>
              ))}

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
                      disabled={!plan.available || currentPlan === "YEARLY"}
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
                        {(plan.displayAmount / 100).toLocaleString(undefined, {
                          style: "currency",
                          currency: "PLN",
                        })}{" "}
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
                      onChange={(event) =>
                        setMethod(
                          event.target.value as "PAYU" | "BANK_TRANSFER",
                        )
                      }
                    >
                      <option value="PAYU">PayU</option>
                      <option value="BANK_TRANSFER">{t("bankTransfer")}</option>
                    </SelectControl>
                  </label>
                  <button
                    className="btn secondary"
                    disabled={start.isPending || change.isPending}
                    onClick={runPayment}
                  >
                    {pending.length
                      ? t("continuePayment")
                      : currentPlan === "FREE"
                        ? t("upgradePlan")
                        : t("renewLicense")}
                  </button>
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
          {billing.isLoading ? (
            <SettingsCardSkeleton rows={3} />
          ) : (
            <>
              <div className="section-heading">
                <FileText />
                <div>
                  <h2>{t("invoicesTransactions")}</h2>
                  <p>{t("invoicesTransactionsHelp")}</p>
                </div>
              </div>

              {billing.data?.payments.length ? (
                billing.data.payments.map((payment) => (
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
                    <span
                      className={`badge ${payment.status === "COMPLETED" ? "success" : "warning"}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="muted">{t("noTransactions")}</p>
              )}

              {billing.data?.salesDocuments.map((document) => (
                <a
                  className="invoice-row"
                  key={document.id}
                  href={document.fileUrl || "#"}
                >
                  <FileText size={16} /> {t("invoice")}{" "}
                  {document.number || document.id.slice(-6)}
                </a>
              ))}
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
