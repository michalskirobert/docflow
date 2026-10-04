"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import {
  FormField,
  InputAction,
  InputActions,
  SelectField,
} from "@/components/shared/form";
import { useGet, usePost } from "@/hooks/use-api";
import { SYSTEM_CATEGORY_KEYS, systemCategoryValue } from "./definitions";
import { useTranslations } from "next-intl";
import { useFeedback } from "@/components/ui/feedback-provider";

type CustomCategory = { id: string; name: string };

export function CategoryField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("categories");
  const { notify } = useFeedback();
  const categories = useGet<CustomCategory[]>(["categories"], "/categories");
  const create = usePost<CustomCategory, { name: string }>("/categories", [
    ["categories"],
  ]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const cancel = () => {
    setName("");
    setAdding(false);
  };

  const add = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || create.isPending) return;
    try {
      const saved = await create.mutateAsync({ name: trimmed });
      onChange(`custom:${saved.id}`);
      setName("");
      setAdding(false);
    } catch {
      notify(t("saveError"), "error");
    }
  };

  if (adding) {
    return (
      <div className="category-field">
        <FormField
          label={t("label")}
          value={name}
          maxLength={60}
          autoFocus
          placeholder={t("customPlaceholder")}
          disabled={create.isPending}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void add();
            }
            if (event.key === "Escape") cancel();
          }}
          suffix={
            <InputActions>
              <InputAction
                label={t("save")}
                onClick={() => void add()}
                disabled={name.trim().length < 2 || create.isPending}
              >
                {create.isPending ? (
                  <LoaderCircle
                    className="spinner"
                    size={18}
                    aria-hidden="true"
                  />
                ) : (
                  <Check size={18} aria-hidden="true" />
                )}
              </InputAction>
              <InputAction
                label={t("cancel")}
                onClick={cancel}
                disabled={create.isPending}
              >
                <X size={18} aria-hidden="true" />
              </InputAction>
            </InputActions>
          }
        />
      </div>
    );
  }

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
    </div>
  );
}
