"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { IMaskInput } from "react-imask";
import { useTranslations } from "next-intl";
import type { TemplateVariable } from "@/features/templates/types";
import { parseFormattedNumber } from "@/features/documents/helpers";
import {
  DateTimePicker,
  InputControl,
  SelectControl,
} from "@/components/shared/form";
import {
  hasValidImageSignature,
  normalizedImageType,
  optimizeTemplateImage,
  SUPPORTED_TEMPLATE_IMAGE_TYPES,
  TEMPLATE_IMAGE_ACCEPT,
} from "@/lib/image-file";

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

function VariableSelect({
  id,
  value,
  options,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
  clearLabel: string;
}) {
  return (
    <SelectControl
      id={id}
      value={value}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </SelectControl>
  );
}

export function VariableField({ variable, value, error, onChange }: Props) {
  const t = useTranslations("documents");
  const label = variable.label || variable.name;

  const variableType = String(variable.type) as VariableType;

  const file = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState("");
  const [imageProcessing, setImageProcessing] = useState(false);

  const id = `document-variable-${variable.name.replace(
    /[^a-zA-Z0-9_-]/g,
    "-",
  )}`;

  const load = async (f?: File) => {
    if (!f) {
      return;
    }

    setUploadError("");
    setImageProcessing(true);

    try {
      const type = normalizedImageType(f);

      if (!SUPPORTED_TEMPLATE_IMAGE_TYPES.has(type)) {
        setUploadError(t("invalidImage"));
        return;
      }

      const bytes = new Uint8Array(await f.slice(0, 16).arrayBuffer());
      if (!hasValidImageSignature(type, bytes)) {
        setUploadError(t("invalidImageSignature"));
        return;
      }

      const optimized = await optimizeTemplateImage(f);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(optimized);
      });
      onChange(dataUrl);
    } catch {
      setUploadError(t("imageReadError"));
    } finally {
      setImageProcessing(false);
    }
  };

  const Label = () => (
    <span className="field-label variable-field-label">
      <span>{label}</span>
      <code className="variable-field-token">{`{{${variable.name}}}`}</code>

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

        <VariableSelect
          id={id}
          value={value}
          options={variable.options ?? []}
          disabled={variable.locked}
          invalid={Boolean(error)}
          onChange={onChange}
          clearLabel={t("clearValue")}
        />

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
        <label className="field-label variable-field-label" htmlFor={id}>
          <span>{label}</span>
          <code className="variable-field-token">{`{{${variable.name}}}`}</code>
          {variable.required && (
            <span className="required" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>

        <div className="native-date-control variable-clearable-control">
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
          {value && !variable.locked && (
            <button
              type="button"
              className="variable-clear-button"
              aria-label={t("clearValue")}
              onClick={() => onChange("")}
            >
              <X size={16} />
            </button>
          )}
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
          className={`document-image-dropzone ${value ? "has-image" : ""} ${imageProcessing ? "is-processing" : ""}`}
          role="button"
          aria-disabled={variable.locked || imageProcessing || Boolean(value)}
          tabIndex={variable.locked || imageProcessing || value ? -1 : 0}
          onClick={() => {
            if (!variable.locked && !imageProcessing && !value)
              file.current?.click();
          }}
          onKeyDown={(e) => {
            if (
              !variable.locked &&
              !imageProcessing &&
              !value &&
              (e.key === "Enter" || e.key === " ")
            ) {
              file.current?.click();
            }
          }}
          onDragOver={(e: DragEvent) => e.preventDefault()}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            if (variable.locked || imageProcessing || value) return;

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
          ) : imageProcessing ? (
            <div
              className="image-processing-state"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="spinner" />
              <strong>{t("processingImage")}</strong>
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
          accept={TEMPLATE_IMAGE_ACCEPT}
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
    const decimalPlaces = Math.max(0, variable.decimalPlaces ?? 0);

    const formatNumberOnBlur = () => {
      if (!value.trim()) return;
      const { number: parsedValue } = parseFormattedNumber(value, variable);
      if (!Number.isFinite(parsedValue)) return;

      const [integerPart, fractionPart] = Math.abs(parsedValue)
        .toFixed(decimalPlaces)
        .split(".");
      const separator = variable.thousandsSeparator ?? "none";
      const grouping =
        separator === "space" ? " " : separator === "none" ? "" : separator;
      const groupedInteger = grouping
        ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, grouping)
        : integerPart;
      const sign = parsedValue < 0 ? "-" : "";
      const decimal = variable.decimalSeparator ?? ",";
      onChange(
        decimalPlaces > 0
          ? `${sign}${groupedInteger}${decimal}${fractionPart}`
          : `${sign}${groupedInteger}`,
      );
    };

    return (
      <label
        className={`field ${error ? "field-error" : ""} ${variable.locked ? "field-locked" : ""}`}
        htmlFor={id}
      >
        <Label />

        <InputControl
          id={id}
          type="text"
          inputMode="decimal"
          disabled={variable.locked}
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            const nextValue = e.target.value;

            // Keep typing permissive. Formatting happens only when the user leaves the field.
            if (/^-?[\d\s.,]*$/.test(nextValue)) {
              onChange(nextValue);
            }
          }}
          onBlur={formatNumberOnBlur}
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
