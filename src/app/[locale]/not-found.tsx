"use client";

import { FileQuestion, Home, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <div className="not-found-visual" aria-hidden="true">
          <FileQuestion size={72} strokeWidth={1.5} />
          <span>404</span>
          <SearchX className="not-found-search-icon" size={28} />
        </div>
        <p className="not-found-eyebrow">DocFlow</p>
        <h1 id="not-found-title">{t("title")}</h1>
        <p className="not-found-description">{t("description")}</p>
        <Link href="/" className="btn not-found-home-link">
          <Home size={18} />
          {t("backHome")}
        </Link>
      </section>
    </main>
  );
}
