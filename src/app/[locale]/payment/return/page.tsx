"use client";

import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/axios";

type State = "checking" | "completed" | "pending" | "failed";
type PaymentStatusResponse = {
  status: "PENDING" | "COMPLETED" | "CANCELED" | "FAILED";
};

export default function PaymentReturnPage() {
  const t = useTranslations("paymentReturn");
  const [state, setState] = useState<State>("checking");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setState("checking");
    setRefreshKey((value) => value + 1);
  }, []);

  useEffect(() => {
    const payment = new URLSearchParams(window.location.search).get("payment");
    if (!payment) {
      setState("failed");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const check = async () => {
      try {
        const { data } = await api.get<PaymentStatusResponse>("/payu/status", {
          params: { payment },
        });
        if (cancelled) return;

        if (data.status === "COMPLETED") {
          setState("completed");
          return;
        }
        if (data.status === "CANCELED" || data.status === "FAILED") {
          setState("failed");
          return;
        }

        attempts += 1;
        if (attempts >= 8) {
          setState("pending");
          return;
        }
        timer = setTimeout(check, 1500);
      } catch {
        if (!cancelled) setState("failed");
      }
    };

    void check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshKey]);

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
            {state === "pending" && (
              <button className="btn secondary" type="button" onClick={refresh}>
                {t("checkAgain")}
              </button>
            )}
            <Link className="btn" href="/login">
              {t("login")}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
