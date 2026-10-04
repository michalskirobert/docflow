"use client";

import { useState } from "react";
import { BookOpen, Check, LoaderCircle, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shared/button";
import { FormField, InputAction, InputActions } from "@/components/shared/form";
import { useFeedback } from "@/components/ui/feedback-provider";
import { api } from "@/lib/axios";
import { useGet, usePost } from "@/hooks/use-api";
import { SYSTEM_CATEGORY_KEYS } from "@/features/categories/definitions";

type CustomCategory = {
  id: string;
  name: string;
  templatesCount: number;
  documentsCount: number;
};

export function DictionariesSettings() {
  const t = useTranslations("categories");
  const { confirm, notify } = useFeedback();
  const categories = useGet<CustomCategory[]>(["categories"], "/categories");
  const create = usePost<CustomCategory, { name: string }>("/categories", [
    ["categories"],
  ]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const add = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || create.isPending) return;
    try {
      await create.mutateAsync({ name: trimmed });
      setName("");
      setAdding(false);
      notify(t("saved"), "success");
    } catch {
      notify(t("saveError"), "error");
    }
  };

  const remove = async (category: CustomCategory) => {
    const accepted = await confirm({
      title: t("deleteTitle", { name: category.name }),
      message:
        category.templatesCount + category.documentsCount > 0
          ? t("deleteUsedMessage", {
              templates: category.templatesCount,
              documents: category.documentsCount,
            })
          : t("deleteUnusedMessage"),
      confirmLabel: t("deleteConfirm"),
      kind: "danger",
    });
    if (!accepted) return;

    setDeletingId(category.id);
    try {
      await api.delete(`/categories/${category.id}`);
      await categories.refetch();
      notify(t("deleted"), "success");
    } catch {
      notify(t("deleteError"), "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="card settings-card dictionaries-card">
      <div className="section-heading">
        <BookOpen />
        <div>
          <h2>{t("dictionaryCategories")}</h2>
          <p>{t("dictionaryCategoriesHelp")}</p>
        </div>
      </div>

      <div className="dictionary-section-heading">
        <div>
          <h3>{t("dictionaryCategories")}</h3>
          <p className="muted">{t("dictionaryCategoriesHelp")}</p>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAdding(true)}
          >
            {t("addCustom")}
          </Button>
        )}
      </div>

      {adding && (
        <div className="dictionary-add-category">
          <FormField
            label={t("customPlaceholder")}
            value={name}
            maxLength={60}
            autoFocus
            disabled={create.isPending}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void add();
              }
              if (event.key === "Escape" && !create.isPending) {
                setAdding(false);
                setName("");
              }
            }}
            suffix={
              <InputActions>
                <InputAction
                  label={t("save")}
                  onClick={() => void add()}
                  disabled={name.trim().length < 2 || create.isPending}
                >
                  {create.isPending ? (
                    <LoaderCircle className="spinner" size={18} />
                  ) : (
                    <Check size={18} />
                  )}
                </InputAction>
                <InputAction
                  label={t("cancel")}
                  onClick={() => {
                    setAdding(false);
                    setName("");
                  }}
                  disabled={create.isPending}
                >
                  <X size={18} />
                </InputAction>
              </InputActions>
            }
          />
        </div>
      )}

      <div className="dictionary-list">
        {SYSTEM_CATEGORY_KEYS.map((key) => (
          <div className="dictionary-row" key={key}>
            <span>{t(`system.${key}`)}</span>
            <span className="dictionary-system-badge">{t("systemBadge")}</span>
          </div>
        ))}

        {categories.isPending && !categories.data && (
          <div className="dictionary-loading">
            <LoaderCircle className="spinner" size={20} /> {t("loading")}
          </div>
        )}

        {(categories.data ?? []).map((category) => (
          <div className="dictionary-row" key={category.id}>
            <div className="dictionary-category-copy">
              <strong>{category.name}</strong>
              <small>
                {t("usage", {
                  templates: category.templatesCount,
                  documents: category.documentsCount,
                })}
              </small>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="dictionary-delete"
              loading={deletingId === category.id}
              disabled={deletingId !== null && deletingId !== category.id}
              onClick={() => void remove(category)}
              aria-label={t("deleteAria", { name: category.name })}
              title={t("deleteConfirm")}
            >
              <Trash2 size={17} />
              <span>{t("deleteConfirm")}</span>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
