import { getTranslations } from "next-intl/server";
import DocumentGenerator from "@/features/documents/document-generator";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const t = await getTranslations("documents");
  const { documentId } = await searchParams;
  return (
    <>
      <h1>{t("prepareEmail")}</h1>
      <DocumentGenerator mode="email" sourceDocumentId={documentId} />
    </>
  );
}
