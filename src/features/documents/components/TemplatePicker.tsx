"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { InputControl } from "@/components/shared/form";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import type { TemplateSummary } from "@/features/templates/types";

type Props = {
  templates: TemplateSummary[];
  loading?: boolean;
  value: string;
  disabled?: boolean;
  onChange: (id: string) => void;
};

export function TemplatePicker({
  templates,
  value,
  onChange,
  loading = false,
  disabled = false,
}: Props) {
  const t = useTranslations("documents");
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = templates.find((template) => template.id === value);
  const filtered = useMemo(
    () =>
      templates.filter((template) =>
        `${template.name} ${template.description ?? ""}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
      ),
    [templates, q],
  );

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  if (loading)
    return (
      <div className="template-combobox">
        <ListSkeleton rows={1} />
      </div>
    );

  return (
    <div className="template-combobox" ref={rootRef}>
      <button
        type="button"
        className="template-combobox-trigger"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="template-combobox-value">
          <strong>{selected?.name ?? t("searchTemplates")}</strong>
          {selected && (
            <small>{selected.description || t("noDescription")}</small>
          )}
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
                setQ("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onChange("");
                  setQ("");
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
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={t("searchTemplates")}
            />
          </label>
          <div className="template-combobox-options">
            {filtered.map((template) => (
              <button
                type="button"
                key={template.id}
                className={value === template.id ? "selected" : ""}
                onClick={() => {
                  onChange(template.id);
                  setOpen(false);
                  setQ("");
                }}
              >
                <span>
                  <strong>{template.name}</strong>
                  <small>{template.description || t("noDescription")}</small>
                </span>
                {value === template.id && <Check size={17} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
