import { getTranslations } from "next-intl/server";

import DocumentGenerator from "@/features/documents/document-generator";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("documents");
  return (
    <>
      <h1>{t("editDocument")}</h1>
      <DocumentGenerator documentId={id} />
    </>
  );
}
