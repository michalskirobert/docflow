"use client";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Template } from "@/features/templates/types";
export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: Template[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () =>
      templates.filter((t) =>
        `${t.name} ${t.description ?? ""}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [templates, q],
  );
  return (
    <div className="template-picker">
      <label className="search-field">
        <Search size={16} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates…"
        />
      </label>
      <div className="template-picker-list">
        {filtered.map((t) => (
          <button
            type="button"
            className={value === t.id ? "selected" : ""}
            key={t.id}
            onClick={() => onChange(t.id)}
          >
            <strong>{t.name}</strong>
            <small>{t.description || "No description"}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
