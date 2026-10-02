"use client";

import { useState } from "react";
import { InputControl, SelectField } from "@/components/shared/form";
import { useGet, usePost } from "@/hooks/use-api";
import { SYSTEM_CATEGORY_KEYS, systemCategoryValue } from "./definitions";
import { useTranslations } from "next-intl";

type CustomCategory = { id: string; name: string };

export function CategoryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("categories");
  const categories = useGet<CustomCategory[]>(["categories"], "/categories");
  const create = usePost<CustomCategory, { name: string }>("/categories", [
    ["categories"],
  ]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const add = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || create.isPending) return;
    const saved = await create.mutateAsync({ name: trimmed });
    onChange(`custom:${saved.id}`);
    setName("");
    setAdding(false);
  };

  return (
    <div className="category-field">
      <SelectField
        label={t("label")}
        value={value}
        onChange={(event) => {
          if (event.target.value === "__add__") {
            setAdding(true);
            return;
          }
          onChange(event.target.value);
        }}
      >
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
        <option value="__add__">{t("addCustom")}</option>
      </SelectField>

      {adding && (
        <div className="category-custom-row">
          <InputControl
            value={name}
            maxLength={60}
            autoFocus
            placeholder={t("customPlaceholder")}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void add();
              }
              if (event.key === "Escape") setAdding(false);
            }}
          />
          <button
            type="button"
            className="btn secondary"
            onClick={() => void add()}
            disabled={name.trim().length < 2 || create.isPending}
          >
            {t("save")}
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setAdding(false)}
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
