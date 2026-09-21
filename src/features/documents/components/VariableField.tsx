"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { IMaskInput } from "react-imask";
import { useTranslations } from "next-intl";
import type { TemplateVariable } from "@/features/templates/types";
import {
  DateTimePicker,
  InputControl,
  SelectControl,
} from "@/components/shared/form";
import {
  MAX_TEMPLATE_IMAGE_BYTES,
  SAFE_TEMPLATE_IMAGE_TYPES,
} from "@/utils/constants";

const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) => String.fromCharCode(...b.slice(0, 3)) === "GIF",
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};

type DateTimeVariableType = "date" | "datetime" | "time";

type VariableType =
  "text" | "number" | "select" | "image" | DateTimeVariableType;

type DateTimeParts = {
  year?: string;
  month?: string;
  day?: string;
  hour?: string;
  minute?: string;
  second?: string;
};

const FORMAT_TOKENS = ["YYYY", "YY", "DD", "MM", "HH", "mm", "ss"] as const;

type FormatToken = (typeof FORMAT_TOKENS)[number];

const TOKEN_LENGTH: Record<FormatToken, number> = {
  YYYY: 4,
  YY: 2,
  DD: 2,
  MM: 2,
  HH: 2,
  mm: 2,
  ss: 2,
};

export function userMaskToIMask(mask: string): string {
  let result = "";

  for (const char of mask) {
    if (char === "9") {
      result += "9";
      continue;
    }

    if (/\d/.test(char)) {
      result += `\\${char}`;
      continue;
    }

    if (char === "\\" || char === "[" || char === "]" || char === "{") {
      result += `\\${char}`;
      continue;
    }

    result += char;
  }

  return result;
}

function getDefaultDateTimeFormat(type: DateTimeVariableType): string {
  switch (type) {
    case "date":
      return "DD.MM.YYYY";

    case "datetime":
      return "DD.MM.YYYY HH:mm";

    case "time":
      return "HH:mm";
  }
}

function getDateTimeFormat(
  variable: TemplateVariable,
  type: DateTimeVariableType,
): string {
  return variable.dateFormat?.trim() || getDefaultDateTimeFormat(type);
}

function getFormatToken(
  format: string,
  position: number,
): FormatToken | undefined {
  return FORMAT_TOKENS.find((token) => format.startsWith(token, position));
}

export function formatToMask(format: string): string {
  let result = "";
  let position = 0;

  while (position < format.length) {
    const token = getFormatToken(format, position);

    if (token) {
      result += "9".repeat(TOKEN_LENGTH[token]);
      position += token.length;
      continue;
    }

    const char = format[position];

    if (/\d/.test(char)) {
      result += `\\${char}`;
    } else if (char === "\\" || char === "[" || char === "]" || char === "{") {
      result += `\\${char}`;
    } else {
      result += char;
    }

    position += 1;
  }

  return result;
}

function canonicalToParts(
  value: string,
  type: DateTimeVariableType,
): DateTimeParts | null {
  if (!value) {
    return null;
  }

  if (type === "date") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return null;
    }

    return {
      year: match[1],
      month: match[2],
      day: match[3],
    };
  }

  if (type === "time") {
    const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);

    if (!match) {
      return null;
    }

    return {
      hour: match[1],
      minute: match[2],
      second: match[3],
    };
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4],
    minute: match[5],
    second: match[6],
  };
}

function formatParts(parts: DateTimeParts, format: string): string {
  const values: Record<FormatToken, string> = {
    YYYY: parts.year ?? "",
    YY: parts.year?.slice(-2) ?? "",
    DD: parts.day ?? "",
    MM: parts.month ?? "",
    HH: parts.hour ?? "",
    mm: parts.minute ?? "",
    ss: parts.second ?? "00",
  };

  let result = "";
  let position = 0;

  while (position < format.length) {
    const token = getFormatToken(format, position);

    if (token) {
      result += values[token];
      position += token.length;
      continue;
    }

    result += format[position];
    position += 1;
  }

  return result;
}

export function formatCanonicalValue(
  value: string,
  format: string,
  type: DateTimeVariableType,
): string {
  const parts = canonicalToParts(value, type);

  if (!parts) {
    return "";
  }

  return formatParts(parts, format);
}

function parseFormattedValue(
  value: string,
  format: string,
): DateTimeParts | null {
  const parts: DateTimeParts = {};

  let valuePosition = 0;
  let formatPosition = 0;

  while (formatPosition < format.length) {
    const token = getFormatToken(format, formatPosition);

    if (token) {
      const length = TOKEN_LENGTH[token];

      const tokenValue = value.slice(valuePosition, valuePosition + length);

      if (
        tokenValue.length !== length ||
        !new RegExp(`^\\d{${length}}$`).test(tokenValue)
      ) {
        return null;
      }

      switch (token) {
        case "YYYY":
          parts.year = tokenValue;
          break;

        case "YY":
          parts.year = `20${tokenValue}`;
          break;

        case "DD":
          parts.day = tokenValue;
          break;

        case "MM":
          parts.month = tokenValue;
          break;

        case "HH":
          parts.hour = tokenValue;
          break;

        case "mm":
          parts.minute = tokenValue;
          break;

        case "ss":
          parts.second = tokenValue;
          break;
      }

      valuePosition += length;
      formatPosition += token.length;
      continue;
    }

    if (value[valuePosition] !== format[formatPosition]) {
      return null;
    }

    valuePosition += 1;
    formatPosition += 1;
  }

  if (valuePosition !== value.length) {
    return null;
  }

  return parts;
}

function isValidDateParts(parts: DateTimeParts): boolean {
  if (!parts.year || !parts.month || !parts.day) {
    return false;
  }

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return false;
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  return day <= daysInMonth;
}

function isValidTimeParts(parts: DateTimeParts): boolean {
  if (!parts.hour || !parts.minute) {
    return false;
  }

  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  const second = parts.second !== undefined ? Number(parts.second) : undefined;

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return false;
  }

  if (
    second !== undefined &&
    (!Number.isInteger(second) || second < 0 || second > 59)
  ) {
    return false;
  }

  return true;
}

export function parseToCanonicalValue(
  value: string,
  format: string,
  type: DateTimeVariableType,
): string | null {
  const parts = parseFormattedValue(value, format);

  if (!parts) {
    return null;
  }

  if (type === "date") {
    if (!isValidDateParts(parts)) {
      return null;
    }

    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  if (type === "time") {
    if (!isValidTimeParts(parts)) {
      return null;
    }

    return parts.second !== undefined
      ? `${parts.hour}:${parts.minute}:${parts.second}`
      : `${parts.hour}:${parts.minute}`;
  }

  if (!isValidDateParts(parts) || !isValidTimeParts(parts)) {
    return null;
  }

  const time =
    parts.second !== undefined
      ? `${parts.hour}:${parts.minute}:${parts.second}`
      : `${parts.hour}:${parts.minute}`;

  return `${parts.year}-${parts.month}-${parts.day}T${time}`;
}

type Props = {
  variable: TemplateVariable;
  value: string;
  error?: string;
  onChange: (v: string) => void;
};

export function VariableField({ variable, value, error, onChange }: Props) {
  const t = useTranslations("documents");
  const label = variable.label || variable.name;

  const variableType = String(variable.type) as VariableType;

  const file = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState("");

  const id = `document-variable-${variable.name.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;

  const load = async (f?: File) => {
    if (!f) {
      return;
    }

    setUploadError("");

    if (
      !SAFE_TEMPLATE_IMAGE_TYPES.includes(f.type as never) ||
      f.size > MAX_TEMPLATE_IMAGE_BYTES
    ) {
      setUploadError(t("invalidImage"));
      return;
    }

    const b = new Uint8Array(await f.slice(0, 16).arrayBuffer());

    if (!MAGIC[f.type]?.(b)) {
      setUploadError(t("invalidImageSignature"));
      return;
    }

    const r = new FileReader();

    r.onload = () => onChange(String(r.result));

    r.onerror = () => setUploadError(t("imageReadError"));

    r.readAsDataURL(f);
  };

  const Label = () => (
    <span className="field-label">
      {label}

      {variable.required && (
        <span className="required" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </span>
  );

  if (variableType === "select") {
    return (
      <label
        className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
        htmlFor={id}
      >
        <Label />

        <SelectControl
          id={id}
          value={value}
          disabled={variable.locked}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">—</option>

          {variable.options?.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </SelectControl>

        {error && <small className="form-error">{error}</small>}
      </label>
    );
  }

  if (
    variableType === "date" ||
    variableType === "datetime" ||
    variableType === "time"
  ) {
    const type = variableType as DateTimeVariableType;
    const format = getDateTimeFormat(variable, type);
    const formattedValue = formatCanonicalValue(value, format, type);
    const pickerLabel =
      type === "date"
        ? t("chooseDate")
        : type === "datetime"
          ? t("chooseDateTime")
          : t("chooseTime");

    return (
      <div
        className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
      >
        <label className="field-label" htmlFor={id}>
          {label}
          {variable.required && (
            <span className="required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>

        <div className="native-date-control">
          <IMaskInput
            id={id}
            className="native-date-input"
            value={formattedValue}
            mask={formatToMask(format)}
            definitions={{ "9": /[0-9]/ }}
            placeholder={format}
            aria-invalid={Boolean(error)}
            disabled={variable.locked}
            onAccept={(nextValue) => {
              const next = String(nextValue);
              if (!next.trim()) {
                onChange("");
                return;
              }
              const canonicalValue = parseToCanonicalValue(next, format, type);
              if (canonicalValue !== null) onChange(canonicalValue);
            }}
          />
          <DateTimePicker
            type={type}
            value={value}
            label={pickerLabel}
            disabled={variable.locked}
            onChange={onChange}
          />
        </div>

        {error && <small className="form-error">{error}</small>}
      </div>
    );
  }

  if (variableType === "image") {
    return (
      <div
        className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
        data-variable-field={variable.name}
      >
        <Label />

        <div
          className="document-image-dropzone"
          role="button"
          aria-disabled={variable.locked}
          tabIndex={variable.locked ? -1 : 0}
          onClick={() => {
            if (!variable.locked) file.current?.click();
          }}
          onKeyDown={(e) => {
            if (!variable.locked && (e.key === "Enter" || e.key === " ")) {
              file.current?.click();
            }
          }}
          onDragOver={(e: DragEvent) => e.preventDefault()}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            if (variable.locked) return;

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
                <Trash2 size={15} />
                {t("removeImage")}
              </button>
            </div>
          ) : (
            <>
              <Upload />

              <strong>{t("dropImage")}</strong>

              <small>{t("imageTypes")}</small>
            </>
          )}
        </div>

        <InputControl
          id={id}
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
  }

  if (variableType === "number") {
    return (
      <label
        className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
        htmlFor={id}
      >
        <Label />
        <InputControl
          id={id}
          type="number"
          inputMode="decimal"
          min={variable.minNumber || undefined}
          max={variable.maxNumber || undefined}
          step={variable.decimalPlaces ? 1 / 10 ** variable.decimalPlaces : 1}
          disabled={variable.locked}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(e) => onChange(e.target.value)}
        />
        {error && <small className="form-error">{error}</small>}
      </label>
    );
  }

  const mask = variable.mask?.trim();

  return (
    <label
      className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
      htmlFor={id}
    >
      <Label />

      {mask ? (
        <IMaskInput
          id={id}
          value={value}
          mask={userMaskToIMask(mask)}
          definitions={{
            "9": /[0-9]/,
          }}
          placeholder={variable.mask}
          aria-invalid={Boolean(error)}
          disabled={variable.locked}
          onAccept={(nextValue) => onChange(String(nextValue))}
        />
      ) : (
        <InputControl
          id={id}
          value={value}
          aria-invalid={Boolean(error)}
          disabled={variable.locked}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {error && <small className="form-error">{error}</small>}
    </label>
  );
}
