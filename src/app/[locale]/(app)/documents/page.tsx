"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
const DocumentList = dynamic(
  () => import("@/features/documents/document-list"),
);
export default function Page() {
  const t = useTranslations("documents");
  return (
    <>
      <h1>{t("title")}</h1>
      <DocumentList />
    </>
  );
}
