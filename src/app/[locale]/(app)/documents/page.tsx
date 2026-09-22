"use client";
import { useTranslations } from "next-intl";
import DocumentList from "@/features/documents/document-list";
export default function Page() {
  const t = useTranslations("documents");
  return (
    <>
      <h1>{t("title")}</h1>
      <DocumentList />
    </>
  );
}
