"use client";

import { Search } from "lucide-react";
import { InputControl } from "@/components/shared/form";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import type { Template } from "@/features/templates/types";

type Props = {
  templates: Template[];
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
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      templates.filter((template) =>
        `${template.name} ${template.description ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [templates, q],
  );

  return (
    <div className="template-picker">
      <label className="search-field">
        <Search size={16} />
        <InputControl
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={t("searchTemplates")}
          disabled={disabled}
        />
      </label>
      <div className="template-picker-list">
        {loading ? (
          <ListSkeleton rows={3} />
        ) : (
          filtered.map((template) => (
            <button
              type="button"
              className={value === template.id ? "selected" : ""}
              key={template.id}
              onClick={() => onChange(template.id)}
              disabled={disabled}
            >
              <strong>{template.name}</strong>
              <small>{template.description || t("noDescription")}</small>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
