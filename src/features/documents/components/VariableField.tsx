"use client";
import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import type { TemplateVariable } from "@/features/templates/types";
import { applyInputMask } from "../helpers";
import {
  MAX_TEMPLATE_IMAGE_BYTES,
  SAFE_TEMPLATE_IMAGE_TYPES,
} from "@/utils/constants";

function formatDateInput(value: string, format = "DD.MM.YYYY") {
  if (!value) return "";
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return value;
  const [, yyyy, mm, dd] = m;
  return format.replace("DD", dd).replace("MM", mm).replace("YYYY", yyyy);
}
function parseDateInput(value: string, format = "DD.MM.YYYY") {
  const tokens = format.match(/DD|MM|YYYY|[^DMY]+/g) ?? [];
  let pattern = "^";
  const groups: string[] = [];
  for (const token of tokens) {
    if (token === "DD") {
      pattern += "(\\d{2})";
      groups.push("dd");
    } else if (token === "MM") {
      pattern += "(\\d{2})";
      groups.push("mm");
    } else if (token === "YYYY") {
      pattern += "(\\d{4})";
      groups.push("yyyy");
    } else pattern += token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  const match = value.match(new RegExp(pattern + "$"));
  if (!match) return value;
  const parts: Record<string, string> = {};
  groups.forEach((key, index) => {
    parts[key] = match[index + 1];
  });
  return parts.yyyy && parts.mm && parts.dd
    ? `${parts.yyyy}-${parts.mm}-${parts.dd}`
    : value;
}
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) => String.fromCharCode(...b.slice(0, 3)) === "GIF",
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};
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
  const file = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const load = async (f?: File) => {
    if (!f) return;
    setUploadError("");
    if (
      !SAFE_TEMPLATE_IMAGE_TYPES.includes(f.type as never) ||
      f.size > MAX_TEMPLATE_IMAGE_BYTES
    ) {
      setUploadError("Invalid image type or file is too large.");
      return;
    }
    const b = new Uint8Array(await f.slice(0, 16).arrayBuffer());
    if (!MAGIC[f.type]?.(b)) {
      setUploadError(
        "The file content does not match a supported image format.",
      );
      return;
    }
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.onerror = () => setUploadError("Could not read the image.");
    r.readAsDataURL(f);
  };
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
          type="text"
          inputMode="numeric"
          value={formatDateInput(value, variable.dateFormat)}
          placeholder={variable.dateFormat ?? "DD.MM.YYYY"}
          onChange={(e) =>
            onChange(parseDateInput(e.target.value, variable.dateFormat))
          }
        />
        <small>{variable.dateFormat}</small>
        {error && <small className="form-error">{error}</small>}
      </label>
    );
  if (variable.type === "image")
    return (
      <div className="field">
        <span>
          {label}
          {variable.required && <span className="required"> *</span>}
        </span>
        <div
          className="document-image-dropzone"
          role="button"
          tabIndex={0}
          onClick={() => file.current?.click()}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && file.current?.click()
          }
          onDragOver={(e: DragEvent) => e.preventDefault()}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            void load(e.dataTransfer.files?.[0]);
          }}
        >
          {value ? (
            <div className="variable-upload-current">
              <img className="variable-upload-preview" src={value} alt="" />
              <button
                type="button"
                className="btn secondary compact"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              >
                <Trash2 size={15} /> Remove image
              </button>
            </div>
          ) : (
            <>
              <Upload />
              <strong>Drop an image here or click to choose</strong>
              <small>PNG, JPG, WEBP or GIF</small>
            </>
          )}
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            void load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {(error || uploadError) && (
          <small className="form-error">{error || uploadError}</small>
        )}
      </div>
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
