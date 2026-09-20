"use client";
import { useState } from "react";
import { Plus, Trash2, Variable } from "lucide-react";
import type { TemplateVariable, VariableType } from "../types";
export function VariableModal({
  onClose,
  onInsert,
  t,
  initial,
}: {
  onClose: () => void;
  onInsert: (v: TemplateVariable) => void;
  t: (key: string) => string;
  initial?: TemplateVariable;
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
        <h3>{initial ? "Edit variable" : t("addVariable")}</h3>
        <p>
          {t("variableHelpBefore")} <code>{`{{variable}}`}</code>{" "}
          {t("variableHelpAfter")}
        </p>
        <div className="form-grid two">
          <label className="field">
            {t("variableName")}
            <input
              autoFocus
              maxLength={80}
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
          <div className="field">
            <span>{t("selectOptions")}</span>
            <div className="option-builder">
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
          <button className="btn" onClick={submit} disabled={!name.trim()}>
            {initial ? "Save changes" : t("insertVariable")}
          </button>
        </div>
      </div>
    </div>
  );
}
