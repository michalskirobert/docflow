"use client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
const TemplateList = dynamic(
  () => import("@/features/templates/template-list"),
);
export default function Page() {
  const t = useTranslations("templates");
  return (
    <>
      <h1>{t("title")}</h1>
      <p className="muted">{t("description")}</p>
      <TemplateList />
    </>
  );
}
