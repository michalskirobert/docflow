"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { InputControl } from "@/components/shared/form";
import { CategoryFilterField } from "@/features/categories/CategoryFilterField";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import type { TemplateSummary } from "@/features/templates/types";

type Props = {
  templates: TemplateSummary[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  value: string;
  disabled?: boolean;
  search: string;
  category: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onLoadMore: () => void;
  onChange: (id: string) => void;
};

export function TemplatePicker({
  templates,
  value,
  onChange,
  loading = false,
  loadingMore = false,
  hasMore = false,
  disabled = false,
  search,
  category,
  onSearchChange,
  onCategoryChange,
  onLoadMore,
}: Props) {
  const t = useTranslations("documents");
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = templates.find((template) => template.id === value);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!open || !target || !hasMore) return;
    const root = target.closest(".template-combobox-options");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) onLoadMore();
      },
      { root, rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [open, hasMore, loadingMore, onLoadMore]);

  return (
    <div className={`template-combobox${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="template-combobox-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="template-combobox-value">
          <strong>{selected?.name ?? t("chooseTemplate")}</strong>
          {selected && <small>{selected.description || t("noDescription")}</small>}
        </span>
        <span className="template-combobox-icons">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              className="template-combobox-clear"
              aria-label="Clear"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                onSearchChange("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange("");
                  onSearchChange("");
                }
              }}
            >
              <X size={16} />
            </span>
          )}
          <ChevronDown size={18} />
        </span>
      </button>
      {open && (
        <div className="template-combobox-menu">
          <label className="search-field template-combobox-search">
            <Search size={16} />
            <InputControl
              autoFocus
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t("searchTemplates")}
            />
          </label>
          <div className="template-combobox-filter template-combobox-filter--compact">
            <CategoryFilterField value={category} onChange={onCategoryChange} />
          </div>
          <div className="template-combobox-options">
            {loading && templates.length === 0 ? (
              <ListSkeleton rows={5} />
            ) : (
              templates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={value === template.id ? "selected" : ""}
                  onClick={() => {
                    onChange(template.id);
                    setOpen(false);
                  }}
                >
                  <span>
                    <strong>{template.name}</strong>
                    <small>{template.description || t("noDescription")}</small>
                  </span>
                  {value === template.id && <Check size={17} />}
                </button>
              ))
            )}
            <div ref={sentinelRef} className="template-picker-sentinel" aria-hidden="true" />
            {loadingMore && (
              <div className="template-picker-loading-more" aria-busy="true">
                <ListSkeleton rows={20} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
