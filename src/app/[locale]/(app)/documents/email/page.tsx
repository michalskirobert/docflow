import { getTranslations } from "next-intl/server";
import DocumentGenerator from "@/features/documents/document-generator";

export default async function Page() {
  const t = await getTranslations("documents");

  return (
    <>
      <h1>{t("prepareEmail")}</h1>
      <DocumentGenerator mode="email" />
    </>
  );
}
