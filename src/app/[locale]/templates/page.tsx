import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
const TemplateList = dynamic(
  () => import("@/features/templates/template-list"),
);
export default async function Page() {
  const t = await getTranslations("templates");
  return (
    <AppShell>
      <h1>{t("title")}</h1>
      <p className="muted">{t("description")}</p>
      <TemplateList />
    </AppShell>
  );
}
