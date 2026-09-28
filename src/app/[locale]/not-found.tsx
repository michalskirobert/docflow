"use client";

import { ArrowLeft, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { DocFlowMark } from "@/components/brand/docflow-logo";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  const router = useRouter();

  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <div className="not-found-brand-glow" />
          <DocFlowMark className="not-found-brand-mark" />
          <span className="not-found-code">404</span>
        </div>
        <p className="not-found-eyebrow">DocFlow <span>by NurByte</span></p>
        <h1 id="not-found-title">{t("title")}</h1>
        <p className="not-found-description">{t("description")}</p>
        <div className="not-found-actions">
          <Link href="/" className="btn not-found-home-link">
            <Home size={18} />{t("backHome")}
          </Link>
          <button type="button" className="btn secondary not-found-back-link" onClick={() => router.back()}>
            <ArrowLeft size={18} />{t("backPrevious")}
          </button>
        </div>
      </section>
    </main>
  );
}
