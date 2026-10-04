"use client";

import { SelectField } from "@/components/shared/form";
import { useGet } from "@/hooks/use-api";
import { useTranslations } from "next-intl";
import { SYSTEM_CATEGORY_KEYS, systemCategoryValue } from "./definitions";

type CustomCategory = { id: string; name: string };

export function CategoryFilterField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("categories");
  const categories = useGet<CustomCategory[]>(["categories"], "/categories");
  return (
    <SelectField
      label={t("filterLabel")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="all">{t("all")}</option>
      {SYSTEM_CATEGORY_KEYS.map((key) => (
        <option key={key} value={systemCategoryValue(key)}>
          {t(`system.${key}`)}
        </option>
      ))}
      {(categories.data ?? []).map((category) => (
        <option key={category.id} value={`custom:${category.id}`}>
          {category.name}
        </option>
      ))}
    </SelectField>
  );
}
