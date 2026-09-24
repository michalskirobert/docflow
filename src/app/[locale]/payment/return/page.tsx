"use client";

import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/axios";
import type { BillingOverview } from "@/features/settings/service";

type State = "checking" | "completed" | "pending" | "failed";

export default function PaymentReturnPage() {
  const t = useTranslations("paymentReturn");
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const { data } = await api.get<BillingOverview>("/billing", {
          params: { paymentReturn: "1" },
        });
        if (cancelled) return;
        const payment = data.payments.find(
          (item: BillingOverview["payments"][number]) =>
            item.provider === "PAYU",
        );
        if (payment?.status === "COMPLETED") return setState("completed");
        if (payment?.status === "CANCELED" || payment?.status === "FAILED")
          return setState("failed");
        attempts += 1;
        if (attempts >= 8) return setState("pending");
        timer = setTimeout(check, 1500);
      } catch {
        if (!cancelled) setState("pending");
      }
    };
    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const Icon =
    state === "checking"
      ? LoaderCircle
      : state === "completed"
        ? CheckCircle2
        : state === "pending"
          ? Clock3
          : XCircle;
  return (
    <main className="payment-return-page">
      <section className="payment-return-card" aria-live="polite">
        <Icon
          className={state === "checking" ? "spinner" : undefined}
          size={44}
        />
        <h1>{t(`${state}Title`)}</h1>
        <p>{t(`${state}Description`)}</p>
        {state !== "checking" && (
          <div className="payment-return-actions">
            <Link className="btn" href="/account">
              {t("account")}
            </Link>
            <Link className="btn secondary" href="/dashboard">
              {t("dashboard")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
