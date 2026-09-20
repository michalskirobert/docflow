"use client";
import { useState } from "react";
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
  const billing = useBillingOverview();
  const remove = useDeleteAccount();
  const start = useStartLicensePayment();
  const change = useChangePaymentMethod();
  const { confirm } = useFeedback();
  const [method, setMethod] = useState<"PAYU" | "BANK_TRANSFER">("PAYU");
  const deleteAccount = async () => {
    if (
      await confirm({
        title: "Delete account?",
        message:
          "Your account, organization, templates, documents and billing history will be permanently deleted. This action cannot be undone.",
        confirmLabel: "Delete account permanently",
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
      <section className="card settings-card">
        <h2>Preferences</h2>
        <p className="muted">Language and interface preferences.</p>
        <LanguageSwitcher />
      </section>
      <section className="card settings-card">
        <div className="section-heading">
          <CreditCard />
          <div>
            <h2>License & payments</h2>
            <p>Manage the current license and payments waiting to be booked.</p>
          </div>
        </div>
        <div className="license-summary">
          <strong>{billing.data?.subscription?.plan ?? "FREE"}</strong>
          <span className="status-active">
            {billing.data?.subscription?.status ?? "ACTIVE"}
          </span>
        </div>
        {pending.map((p) => (
          <div className="payment-row" key={p.id}>
            <div>
              <strong>
                {(p.grossAmount / 100).toFixed(2)} {p.currency}
              </strong>
              <small>
                {p.provider} · {p.transferReference || "online payment"}
              </small>
            </div>
            <span className="badge warning">Pending</span>
          </div>
        ))}
        <label className="field">
          Payment method
          <select
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as "PAYU" | "BANK_TRANSFER")
            }
          >
            <option value="PAYU">PayU</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </select>
        </label>
        <button
          className="btn secondary"
          disabled={start.isPending || change.isPending}
          onClick={runPayment}
        >
          {pending.length
            ? "Change method / continue payment"
            : "Pay / renew annual license"}
        </button>
        {(start.data?.transferReference || change.data?.transferReference) && (
          <p className="payment-reference">
            Transfer title:{" "}
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
            <h2>Invoices & transactions</h2>
            <p>Paid and pending transactions for your organization.</p>
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
          <p className="muted">No transactions yet.</p>
        )}
        {billing.data?.salesDocuments.map((x) => (
          <a className="invoice-row" key={x.id} href={x.fileUrl || "#"}>
            <FileText size={16} /> Invoice {x.number || x.id.slice(-6)}
          </a>
        ))}
      </section>
      <section className="card settings-card danger-zone">
        <div className="section-heading">
          <ShieldAlert />
          <div>
            <h2>Danger zone</h2>
            <p>Permanent account actions.</p>
          </div>
        </div>
        <button
          className="btn danger"
          disabled={remove.isPending}
          onClick={deleteAccount}
        >
          <Trash2 size={16} /> Delete account
        </button>
      </section>
    </div>
  );
}
