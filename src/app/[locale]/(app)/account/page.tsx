"use client";
import { useTranslations } from "next-intl";
import SettingsPanel from "@/features/settings/SettingsPanel";
export default function Page() {
  const t = useTranslations("settings");
  return (
    <>
      <div className="page-heading">
        <h1>{t("accountTitle")}</h1>
        <p className="muted">{t("accountDescription")}</p>
      </div>
      <SettingsPanel />
    </>
  );
}
