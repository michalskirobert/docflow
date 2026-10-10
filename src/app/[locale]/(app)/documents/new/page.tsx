import { getTranslations } from "next-intl/server";
import DocumentGenerator from "@/features/documents/document-generator";
export default async function Page() {
  const t = await getTranslations("documents");
  return (
    <>
      <h1 className="document-editor-page-title">{t("newDocument")}</h1>
      <DocumentGenerator />
    </>
  );
}
