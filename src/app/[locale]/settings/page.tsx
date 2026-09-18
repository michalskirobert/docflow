import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
const LanguageSwitcher = dynamic(
  () => import("@/features/language/language-switcher"),
);
export default async function Page() {
  const t = await getTranslations("settings");
  return (
    <AppShell>
      <h1>{t("title")}</h1>
      <p className="muted">{t("languageHelp")}</p>
      <LanguageSwitcher />
    </AppShell>
  );
}
