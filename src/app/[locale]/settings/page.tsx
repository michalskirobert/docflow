import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import SettingsPanel from "@/features/settings/SettingsPanel";
export default async function Page() {
  const t = await getTranslations("settings");
  return (
    <AppShell>
      <div className="page-heading">
        <h1>{t("title")}</h1>
        <p className="muted">{t("description")}</p>
      </div>
      <SettingsPanel />
    </AppShell>
  );
}
