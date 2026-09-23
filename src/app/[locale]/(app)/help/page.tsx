"use client";
import { useTranslations } from "next-intl";
import { HelpPanel } from "@/features/help/HelpPanel";
export default function HelpPage() {
  const t = useTranslations("help");
  return (
    <>
      <div className="page-heading">
        <h1>{t("title")}</h1>
        <p className="muted">{t("description")}</p>
      </div>
      <HelpPanel />
    </>
  );
}
