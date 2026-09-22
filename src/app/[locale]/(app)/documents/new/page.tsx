import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
const DocumentGenerator = dynamic(
  () => import("@/features/documents/document-generator"),
);
export default async function Page() {
  const t = await getTranslations("documents");
  return (
    <>
      <h1>{t("newDocument")}</h1>
      <DocumentGenerator />
    </>
  );
}
