"use client";
import { useState } from "react";
import { Variable } from "lucide-react";
import type { TemplateVariable, VariableType } from "../types";
export function VariableModal({
  initial,
  onClose,
  onInsert,
  t,
}: {
  initial?: TemplateVariable;
  onClose: () => void;
  onInsert: (v: TemplateVariable) => void;
  t: (key: string) => string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<VariableType>(initial?.type ?? "text");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [requiredMessage, setRequiredMessage] = useState(
    initial?.requiredMessage ?? t("requiredDefault"),
  );
  const [mask, setMask] = useState(initial?.mask ?? "");
  const [dateFormat, setDateFormat] = useState(
    initial?.dateFormat ?? "DD.MM.YYYY",
  );
  const [options, setOptions] = useState(initial?.options?.join("\n") ?? "");
  const [imageWidth, setImageWidth] = useState(initial?.imageWidth ?? 180);
  const [imageHeight, setImageHeight] = useState(initial?.imageHeight ?? 120);
  const submit = () => {
    const clean = name.trim().replace(/[^\w.]/g, "");
    if (!clean) return;
    onInsert({
      name: clean,
      type,
      required,
      requiredMessage: required ? requiredMessage : undefined,
      mask: type === "text" && mask ? mask : undefined,
      dateFormat: type === "date" ? dateFormat : undefined,
      options:
        type === "select"
          ? options
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean)
          : undefined,
      imageWidth: type === "image" ? imageWidth : undefined,
      imageHeight: type === "image" ? imageHeight : undefined,
    });
  };
  return (
    <div className="dialog-backdrop">
      <div className="dialog variable-dialog">
        <span className="eyebrow">
          <Variable size={14} /> {t("dynamicContent")}
        </span>
        <h3>{t("addVariable")}</h3>
        <p>
          {t("variableHelpBefore")} <code>{`{{variable}}`}</code>{" "}
          {t("variableHelpAfter")}
        </p>
        <div className="form-grid two">
          <label className="field">
            {t("variableName")}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="customerName"
            />
          </label>
          <label className="field">
            {t("variableType")}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as VariableType)}
            >
              <option value="text">{t("typeText")}</option>
              <option value="date">{t("typeDate")}</option>
              <option value="image">{t("typeImage")}</option>
              <option value="select">{t("typeSelect")}</option>
            </select>
          </label>
        </div>
        {type === "text" && (
          <label className="field">
            {t("inputMask")}
            <input
              value={mask}
              onChange={(e) => setMask(e.target.value)}
              placeholder="AAA-999 / 99-999"
            />
            <small>{t("maskHelp")}</small>
          </label>
        )}
        {type === "date" && (
          <label className="field">
            {t("dateFormat")}
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              <option>DD.MM.YYYY</option>
              <option>YYYY-MM-DD</option>
              <option>DD/MM/YYYY</option>
            </select>
          </label>
        )}
        {type === "select" && (
          <label className="field">
            {t("selectOptions")}
            <textarea
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder={t("oneOptionPerLine")}
            />
          </label>
        )}
        {type === "image" && (
          <div className="form-grid two">
            <label className="field">
              {t("widthPx")}
              <input
                type="number"
                min="32"
                value={imageWidth}
                onChange={(e) => setImageWidth(+e.target.value)}
              />
            </label>
            <label className="field">
              {t("heightPx")}
              <input
                type="number"
                min="32"
                value={imageHeight}
                onChange={(e) => setImageHeight(+e.target.value)}
              />
            </label>
            <div
              className="variable-image-placeholder"
              style={{
                width: Math.min(imageWidth, 280),
                height: Math.min(imageHeight, 180),
              }}
            >
              {t("imagePlaceholder")}
            </div>
          </div>
        )}
        <label className="check-row">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          <span>{t("requiredField")}</span>
        </label>
        {required && (
          <label className="field">
            {t("requiredMessage")}
            <input
              value={requiredMessage}
              onChange={(e) => setRequiredMessage(e.target.value)}
            />
          </label>
        )}
        <div className="variable-example">
          {t("result")}: <code>{`{{${name.trim() || "customerName"}}}`}</code>
        </div>
        <div className="dialog-actions">
          <button className="btn secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button className="btn" onClick={submit} disabled={!name.trim()}>
            {t("insertVariable")}
          </button>
        </div>
      </div>
    </div>
  );
}
