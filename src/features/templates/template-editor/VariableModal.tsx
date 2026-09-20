"use client";
import { useRef, useState } from "react";
import { Plus, Trash2, Variable } from "lucide-react";
import type { TemplateVariable, VariableType } from "../types";
export function VariableModal({
  onClose,
  onInsert,
  t,
  initial,
  existingVariables,
}: {
  onClose: () => void;
  onInsert: (v: TemplateVariable) => void;
  t: (key: string) => string;
  initial?: TemplateVariable;
  existingVariables: TemplateVariable[];
}) {
  const [label, setLabel] = useState(initial?.label ?? initial?.name ?? "");
  const [labelError, setLabelError] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameError, setNameError] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<VariableType>(initial?.type ?? "text");
  const [required, setRequired] = useState(initial?.required ?? false);
  const [requiredMessage, setRequiredMessage] = useState(
    initial?.requiredMessage ?? t("requiredDefault"),
  );
  const [mask, setMask] = useState(initial?.mask ?? "");
  const [dateFormat, setDateFormat] = useState(
    initial?.dateFormat ?? "DD.MM.YYYY",
  );
  const [options, setOptions] = useState<string[]>(initial?.options ?? [""]);
  const [imageWidth, setImageWidth] = useState(initial?.imageWidth ?? 180);
  const [imageHeight, setImageHeight] = useState<number | undefined>(
    initial?.imageHeight,
  );
  const [imageAlign, setImageAlign] = useState<
    "inline" | "left" | "center" | "right"
  >(initial?.imageAlign ?? "center");
  const [imageFit, setImageFit] = useState<"contain" | "cover" | "fill">(
    initial?.imageFit ?? "contain",
  );
  const submit = () => {
    const clean = name.trim().replace(/[^\w.]/g, "");
    if (!label.trim()) {
      setLabelError(t("variableLabelRequired"));
      labelRef.current?.focus();
      return;
    }
    if (!clean) {
      setNameError(t("variableNameRequired"));
      nameRef.current?.focus();
      return;
    }
    const duplicate = existingVariables.some(
      (variable) =>
        variable.name.toLocaleLowerCase() === clean.toLocaleLowerCase() &&
        variable.name !== initial?.name,
    );
    if (duplicate) {
      setNameError(t("variableNameDuplicate"));
      nameRef.current?.focus();
      return;
    }
    setNameError("");
    onInsert({
      name: clean,
      label: label.trim(),
      type,
      required,
      requiredMessage: required ? requiredMessage : undefined,
      mask: type === "text" && mask ? mask : undefined,
      dateFormat: ["date", "datetime", "time"].includes(type)
        ? dateFormat
        : undefined,
      options:
        type === "select"
          ? options.map((x) => x.trim()).filter(Boolean)
          : undefined,
      imageWidth: type === "image" ? imageWidth : undefined,
      imageHeight: type === "image" ? imageHeight : undefined,
      imageAlign: type === "image" ? imageAlign : undefined,
      imageFit: type === "image" ? imageFit : undefined,
    });
  };
  return (
    <div className="dialog-backdrop">
      <div className="dialog variable-dialog">
        <span className="eyebrow">
          <Variable size={14} /> {t("dynamicContent")}
        </span>
        <h3>{initial ? t("editVariable") : t("addVariable")}</h3>
        <p>
          {t("variableHelpBefore")} <code>{`{{variable}}`}</code>{" "}
          {t("variableHelpAfter")}
        </p>
        <div className="form-grid two">
          <label className="field">
            {t("variableLabel")}
            <input
              ref={labelRef}
              autoFocus
              maxLength={120}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setLabelError("");
              }}
              placeholder={t("variableLabelPlaceholder")}
              aria-invalid={Boolean(labelError)}
            />
            {labelError && <small className="error">{labelError}</small>}
            <small>{t("variableLabelHelp")}</small>
          </label>
          <label className="field">
            {t("variableName")}
            <input
              ref={nameRef}
              maxLength={80}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError("");
              }}
              placeholder="customerName"
              aria-invalid={Boolean(nameError)}
            />
            {nameError && <small className="error">{nameError}</small>}
            <small>{t("variableNameHelp")}</small>
          </label>
          <label className="field">
            {t("variableType")}
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value as VariableType;
                setType(next);
                setDateFormat(
                  next === "time"
                    ? "HH:mm"
                    : next === "datetime"
                      ? "DD.MM.YYYY HH:mm"
                      : "DD.MM.YYYY",
                );
              }}
            >
              <option value="text">{t("typeText")}</option>
              <option value="date">{t("typeDate")}</option>
              <option value="datetime">{t("typeDateTime")}</option>
              <option value="time">{t("typeTime")}</option>
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
        {["date", "datetime", "time"].includes(type) && (
          <label className="field">
            {t("dateFormat")}
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              {type === "date" && (
                <>
                  <option>DD.MM.YYYY</option>
                  <option>YYYY-MM-DD</option>
                  <option>DD/MM/YYYY</option>
                </>
              )}
              {type === "datetime" && (
                <>
                  <option>DD.MM.YYYY HH:mm</option>
                  <option>YYYY-MM-DD HH:mm</option>
                  <option>DD/MM/YYYY HH:mm</option>
                </>
              )}
              {type === "time" && (
                <>
                  <option>HH:mm</option>
                  <option>HH:mm:ss</option>
                </>
              )}
            </select>
          </label>
        )}
        {type === "select" && (
          <div className="field">
            <span>{t("selectOptions")}</span>
            <div className="option-builder option-builder-fixed">
              {options.map((option, index) => (
                <div className="option-row" key={index}>
                  <input
                    value={option}
                    onChange={(e) =>
                      setOptions((list) =>
                        list.map((x, i) => (i === index ? e.target.value : x)),
                      )
                    }
                    placeholder={`${t("option")} ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() =>
                      setOptions((list) => list.filter((_, i) => i !== index))
                    }
                    disabled={options.length === 1}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn secondary compact"
                onClick={() => setOptions((x) => [...x, ""])}
              >
                <Plus /> {t("addOption")}
              </button>
            </div>
          </div>
        )}
        {type === "image" && (
          <>
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
                  value={imageHeight ?? ""}
                  placeholder="auto"
                  onChange={(e) =>
                    setImageHeight(e.target.value ? +e.target.value : undefined)
                  }
                />
              </label>
              <label className="field">
                {t("placement")}
                <select
                  value={imageAlign}
                  onChange={(e) =>
                    setImageAlign(e.target.value as typeof imageAlign)
                  }
                >
                  <option value="inline">{t("inline")}</option>
                  <option value="left">{t("leftWrap")}</option>
                  <option value="center">{t("center")}</option>
                  <option value="right">{t("rightWrap")}</option>
                </select>
              </label>
              <label className="field">
                {t("imageFit")}
                <select
                  value={imageFit}
                  onChange={(e) =>
                    setImageFit(e.target.value as typeof imageFit)
                  }
                >
                  <option value="contain">{t("contain")}</option>
                  <option value="cover">{t("cover")}</option>
                  <option value="fill">fill</option>
                </select>
              </label>
            </div>
            <div
              className="variable-image-placeholder"
              style={{
                width: Math.min(imageWidth, 280),
                height: imageHeight ? Math.min(imageHeight, 180) : 120,
              }}
            >
              🖼 {`{{${name || "image"}}}`}
            </div>
          </>
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
          <button
            className="btn"
            onClick={submit}
            disabled={!name.trim() || !label.trim()}
          >
            {initial ? t("saveVariableChanges") : t("insertVariable")}
          </button>
        </div>
      </div>
    </div>
  );
}
