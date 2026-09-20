"use client";
import type { ChangeEvent } from "react";
import type { TemplateVariable } from "@/features/templates/types";
import { applyInputMask } from "../helpers";
export function VariableField({
  variable,
  value,
  error,
  onChange,
}: {
  variable: TemplateVariable;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const label = variable.label || variable.name;
  if (variable.type === "select")
    return (
      <label className="field">
        {label}
        {variable.required && <span className="required"> *</span>}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {variable.options?.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        {error && <small className="form-error">{error}</small>}
      </label>
    );
  if (variable.type === "date")
    return (
      <label className="field">
        {label}
        {variable.required && <span className="required"> *</span>}
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <small>{variable.dateFormat}</small>
        {error && <small className="form-error">{error}</small>}
      </label>
    );
  if (variable.type === "image")
    return (
      <label className="field">
        {label}
        {variable.required && <span className="required"> *</span>}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => onChange(String(r.result));
            r.readAsDataURL(f);
          }}
        />
        {value && (
          <img className="variable-upload-preview" src={value} alt="" />
        )}
        {error && <small className="form-error">{error}</small>}
      </label>
    );
  return (
    <label className="field">
      {label}
      {variable.required && <span className="required"> *</span>}
      <input
        value={value}
        onChange={(e) =>
          onChange(applyInputMask(e.target.value, variable.mask))
        }
        placeholder={variable.mask || undefined}
      />
      {error && <small className="form-error">{error}</small>}
    </label>
  );
}
