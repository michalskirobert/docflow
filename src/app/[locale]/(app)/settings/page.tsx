"use client";
import { useTranslations } from "next-intl";
import PreferencesSettings from "@/features/settings/PreferencesSettings";
export default function Page() {
  const t = useTranslations("settings");
  return (
    <>
      <div className="page-heading">
        <h1>{t("title")}</h1>
        <p className="muted">{t("preferencesDescription")}</p>
      </div>
      <PreferencesSettings />
    </>
  );
}
