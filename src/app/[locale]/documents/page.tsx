import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
const DocumentList = dynamic(
  () => import("@/features/documents/document-list"),
);
export default async function Page() {
  const t = await getTranslations("documents");
  return (
    <AppShell>
      <h1>{t("title")}</h1>
      <DocumentList />
    </AppShell>
  );
}
