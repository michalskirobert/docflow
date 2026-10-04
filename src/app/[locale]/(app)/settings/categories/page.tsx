"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DictionariesSettings } from "@/features/settings/DictionariesSettings";

export default function CategoriesSettingsPage() {
  const t = useTranslations("categories");
  return (
    <>
      <div className="page-heading dictionaries-page-heading">
        <div>
          <h1>{t("dictionaryCategories")}</h1>
          <p className="muted">{t("dictionaryCategoriesHelp")}</p>
        </div>
        <Link href="/settings" className="dictionaries-back">
          <ArrowLeft size={17} />
          {t("backToSettings")}
        </Link>
      </div>
      <div className="dictionaries-page-grid">
        <DictionariesSettings />
      </div>
    </>
  );
}
