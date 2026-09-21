"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/i18n/config";
import { usePathname, useRouter } from "@/i18n/navigation";

import { useUpdateLocale } from "./service";
import { SelectControl } from "@/components/shared/form";

const labels: Record<Locale, string> = {
  pl: "Polski",
  en: "English",
  id: "Bahasa Indonesia",
};

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const updateLocale = useUpdateLocale();

  function change(nextLocale: Locale) {
    localStorage.setItem("docflow-locale", nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;

    updateLocale.mutate(
      { locale: nextLocale },
      {
        onSettled: () => {
          router.replace(pathname, { locale: nextLocale });
          router.refresh();
        },
      },
    );
  }

  return (
    <label className="field language-field">
      {t("language")}
      <SelectControl
        value={locale}
        onChange={(event) => change(event.target.value as Locale)}
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectControl>
    </label>
  );
}
