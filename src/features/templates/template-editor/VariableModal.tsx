"use client";
import { InputControl, SelectControl } from "@/components/shared/form";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useMemo, useState } from "react";
import { IMaskInput } from "react-imask";
import { DateTimePicker } from "@/components/shared/form";
import {
  formatCanonicalValue,
  formatToMask,
  parseToCanonicalValue,
  userMaskToIMask,
} from "@/features/documents/components/VariableField";
import { Bold, Italic, Plus, Trash2, Underline, Variable } from "lucide-react";
import type { TemplateVariable, VariableType } from "../types";

const makeTag = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^[0-9]+/, "");
const num0 = (v: string) => Math.max(0, Number(v) || 0);

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
  const generatedName = useMemo(
    () => initial?.name ?? makeTag(label),
    [initial?.name, label],
  );
  const [type, setType] = useState<VariableType>(initial?.type ?? "text");
  const [hasDefault, setHasDefault] = useState(
    initial?.defaultValue !== undefined ||
      initial?.defaultValueMode === "current",
  );
  const [defaultValue, setDefaultValue] = useState(initial?.defaultValue ?? "");
  const [defaultValueMode, setDefaultValueMode] = useState<"fixed" | "current">(
    initial?.defaultValueMode ?? "fixed",
  );
  const [locked, setLocked] = useState(initial?.locked ?? false);
  const [required, setRequired] = useState(initial?.required ?? false);
  const [requiredMessage, setRequiredMessage] = useState(
    initial?.requiredMessage ?? t("requiredDefault"),
  );
  const [mask, setMask] = useState(initial?.mask ?? "");
  const [dateFormat, setDateFormat] = useState(
    initial?.dateFormat ?? "DD.MM.YYYY",
  );
  const [options, setOptions] = useState(
    initial?.options?.length ? initial.options : [""],
  );
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
  const [minLength, setMinLength] = useState(initial?.minLength ?? 0);
  const [maxLength, setMaxLength] = useState(initial?.maxLength ?? 0);
  const [minNumber, setMinNumber] = useState(initial?.minNumber ?? 0);
  const [maxNumber, setMaxNumber] = useState(initial?.maxNumber ?? 0);
  const [decimalPlaces, setDecimalPlaces] = useState(
    initial?.decimalPlaces ?? 0,
  );
  const [decimalSeparator, setDecimalSeparator] = useState<"." | ",">(
    initial?.decimalSeparator ?? ",",
  );
  const [thousandsSeparator, setThousandsSeparator] = useState<
    "none" | "." | "," | "space"
  >(initial?.thousandsSeparator ?? "none");
  const [minDate, setMinDate] = useState(initial?.minDate ?? "");
  const [maxDate, setMaxDate] = useState(initial?.maxDate ?? "");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 16);
  const [bold, setBold] = useState(initial?.bold ?? false);
  const [italic, setItalic] = useState(initial?.italic ?? false);
  const [underline, setUnderline] = useState(initial?.underline ?? false);
  const [color, setColor] = useState(initial?.color ?? "#111827");
  const cleanOptions = options.map((x) => x.trim()).filter(Boolean);
  const duplicate =
    !!generatedName &&
    existingVariables.some(
      (v) =>
        v.name.toLowerCase() === generatedName.toLowerCase() &&
        v.name !== initial?.name,
    );
  const toggle = (value: boolean, setter: (v: boolean) => void) => () =>
    setter(!value);
  const submit = () => {
    if (!label.trim() || !generatedName || duplicate) return;
    const nextDefault =
      hasDefault && defaultValueMode === "fixed" ? defaultValue : undefined;
    onInsert({
      name: generatedName,
      label: label.trim(),
      type,
      defaultValue: nextDefault,
      defaultValueMode:
        hasDefault && ["date", "datetime", "time"].includes(type)
          ? defaultValueMode
          : undefined,
      locked,
      required,
      requiredMessage: required ? requiredMessage : undefined,
      mask: type === "text" && mask ? mask : undefined,
      minLength: type === "text" ? minLength : undefined,
      maxLength: type === "text" ? maxLength : undefined,
      minNumber: type === "number" ? minNumber : undefined,
      maxNumber: type === "number" ? maxNumber : undefined,
      decimalPlaces: type === "number" ? decimalPlaces : undefined,
      decimalSeparator: type === "number" ? decimalSeparator : undefined,
      thousandsSeparator: type === "number" ? thousandsSeparator : undefined,
      minDate:
        ["date", "datetime"].includes(type) && minDate ? minDate : undefined,
      maxDate:
        ["date", "datetime"].includes(type) && maxDate ? maxDate : undefined,
      dateFormat: ["date", "datetime", "time"].includes(type)
        ? dateFormat
        : undefined,
      options: type === "select" ? cleanOptions : undefined,
      imageWidth: type === "image" ? imageWidth : undefined,
      imageHeight: type === "image" ? imageHeight : undefined,
      imageAlign: type === "image" ? imageAlign : undefined,
      imageFit: type === "image" ? imageFit : undefined,
      fontSize: type !== "image" ? fontSize : undefined,
      bold: type !== "image" ? bold : undefined,
      italic: type !== "image" ? italic : undefined,
      underline: type !== "image" ? underline : undefined,
      color: type !== "image" ? color : undefined,
    });
  };
  const defaultControl =
    type === "select" ? (
      <SelectControl
        value={defaultValue}
        onChange={(e) => setDefaultValue(e.target.value)}
      >
        <option value="">—</option>
        {cleanOptions.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </SelectControl>
    ) : type === "number" ? (
      <InputControl
        type="number"
        inputMode="decimal"
        step={decimalPlaces ? 1 / 10 ** decimalPlaces : 1}
        value={defaultValue}
        onChange={(e) => setDefaultValue(e.target.value)}
      />
    ) : ["date", "datetime", "time"].includes(type) ? (
      (() => {
        const dateType = type as "date" | "datetime" | "time";
        const formatted = formatCanonicalValue(
          defaultValue,
          dateFormat,
          dateType,
        );
        return (
          <div className="native-date-control">
            <IMaskInput
              className="native-date-input"
              value={formatted}
              mask={formatToMask(dateFormat)}
              definitions={{ "9": /[0-9]/ }}
              placeholder={dateFormat}
              onAccept={(value) => {
                const next = String(value);
                if (!next.trim()) {
                  setDefaultValue("");
                  return;
                }
                const canonical = parseToCanonicalValue(
                  next,
                  dateFormat,
                  dateType,
                );
                if (canonical !== null) setDefaultValue(canonical);
              }}
            />
            <DateTimePicker
              type={dateType}
              value={defaultValue}
              label={t("defaultValue")}
              onChange={setDefaultValue}
            />
          </div>
        );
      })()
    ) : mask.trim() ? (
      <IMaskInput
        value={defaultValue}
        mask={userMaskToIMask(mask.trim())}
        definitions={{ "9": /[0-9]/ }}
        placeholder={mask}
        onAccept={(value) => setDefaultValue(String(value))}
      />
    ) : (
      <InputControl
        value={defaultValue}
        onChange={(e) => setDefaultValue(e.target.value)}
      />
    );

  return (
    <div className="dialog-backdrop">
      <div className="dialog variable-dialog">
        <div className="variable-dialog-scroll">
          <span className="eyebrow">
            <Variable size={14} />
            {t("dynamicContent")}
          </span>
          <h3>{initial ? t("editVariable") : t("addVariable")}</h3>
          <section className="variable-form-section">
            <h4>{t("generalSettings")}</h4>
            <div className="form-grid two">
              <label className="field">
                <span className="field-label-with-help">
                  {t("variableLabel")}
                  <HelpTooltip text={t("variableLabelHelp")} />
                </span>
                <InputControl
                  autoFocus
                  maxLength={120}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                {!label.trim() && (
                  <small className="error">{t("variableLabelRequired")}</small>
                )}
              </label>
              <label className="field">
                <span className="field-label-with-help">
                  {t("variableName")}
                  <HelpTooltip text={t("variableNameHelp")} />
                </span>
                <InputControl
                  className="locked-control"
                  value={generatedName}
                  readOnly
                  disabled
                  aria-invalid={duplicate}
                />
                {duplicate && (
                  <small className="error">{t("variableNameDuplicate")}</small>
                )}
              </label>
              <label className="field">
                {t("variableType")}
                <SelectControl
                  value={type}
                  onChange={(e) => {
                    const n = e.target.value as VariableType;
                    setType(n);
                    setDefaultValue("");
                    setDefaultValueMode("fixed");
                    setDateFormat(
                      n === "time"
                        ? "HH:mm"
                        : n === "datetime"
                          ? "DD.MM.YYYY HH:mm"
                          : "DD.MM.YYYY",
                    );
                  }}
                >
                  <option value="text">{t("typeText")}</option>
                  <option value="number">{t("typeNumber")}</option>
                  <option value="date">{t("typeDate")}</option>
                  <option value="datetime">{t("typeDateTime")}</option>
                  <option value="time">{t("typeTime")}</option>
                  <option value="image">{t("typeImage")}</option>
                  <option value="select">{t("typeSelect")}</option>
                </SelectControl>
              </label>
              {type !== "image" && (
                <label className="field">
                  {t("defaultValueOption")}
                  <SelectControl
                    value={hasDefault ? "yes" : "no"}
                    onChange={(e) => {
                      const yes = e.target.value === "yes";
                      setHasDefault(yes);
                      if (!yes) setDefaultValue("");
                    }}
                  >
                    <option value="no">{t("no")}</option>
                    <option value="yes">{t("yes")}</option>
                  </SelectControl>
                </label>
              )}
            </div>
            {hasDefault && type !== "image" && (
              <div className="field">
                <span className="default-value-heading">
                  <span>{t("defaultValue")}</span>
                  {["date", "datetime", "time"].includes(type) && (
                    <button
                      type="button"
                      className={`btn secondary compact current-value-toggle ${defaultValueMode === "current" ? "active" : ""}`}
                      onClick={() =>
                        setDefaultValueMode(
                          defaultValueMode === "current" ? "fixed" : "current",
                        )
                      }
                      title={t("currentValueHelp")}
                    >
                      {t("currentValue")}
                    </button>
                  )}
                </span>
                <div
                  className={
                    defaultValueMode === "current"
                      ? "default-value-current"
                      : ""
                  }
                >
                  {defaultValueMode === "current" ? (
                    <div className="current-value-preview">
                      {t("currentValue")}
                    </div>
                  ) : (
                    defaultControl
                  )}
                </div>
              </div>
            )}
            <label className="check-row">
              <InputControl
                type="checkbox"
                checked={locked}
                onChange={(e) => setLocked(e.target.checked)}
              />
              <span>{t("lockedField")}</span>
              <HelpTooltip text={t("lockedFieldHelp")} />
            </label>
          </section>

          <section className="variable-form-section">
            <h4>{t("fieldSettings")}</h4>
            {type === "text" && (
              <label className="field">
                <span className="field-label-with-help">
                  {t("inputMask")}
                  <HelpTooltip text={t("maskHelp")} />
                </span>
                <InputControl
                  value={mask}
                  onChange={(e) => setMask(e.target.value)}
                  placeholder="AAA-999 / 99-999"
                />
              </label>
            )}
            {type === "number" && (
              <div className="form-grid two">
                <label className="field">
                  {t("decimalPlaces")}
                  <InputControl
                    type="number"
                    min="0"
                    max="12"
                    inputMode="numeric"
                    value={decimalPlaces}
                    onChange={(e) =>
                      setDecimalPlaces(Math.min(12, num0(e.target.value)))
                    }
                  />
                </label>
                <label className="field">
                  {t("decimalSeparator")}
                  <SelectControl
                    value={decimalSeparator}
                    onChange={(e) => {
                      const next = e.target.value as "." | ",";
                      setDecimalSeparator(next);
                      if (thousandsSeparator === next)
                        setThousandsSeparator("none");
                    }}
                  >
                    <option value=",">{t("separatorComma")}</option>
                    <option value=".">{t("separatorDot")}</option>
                  </SelectControl>
                </label>
                <label className="field">
                  {t("thousandsSeparator")}
                  <SelectControl
                    value={thousandsSeparator}
                    onChange={(e) =>
                      setThousandsSeparator(
                        e.target.value as "none" | "." | "," | "space",
                      )
                    }
                  >
                    <option value="none">{t("separatorNone")}</option>
                    <option value="." disabled={decimalSeparator === "."}>
                      {t("separatorDot")}
                    </option>
                    <option value="," disabled={decimalSeparator === ","}>
                      {t("separatorComma")}
                    </option>
                    <option value="space">{t("separatorSpace")}</option>
                  </SelectControl>
                </label>
              </div>
            )}
            {["date", "datetime", "time"].includes(type) && (
              <label className="field">
                {t("dateFormat")}
                <SelectControl
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
                </SelectControl>
              </label>
            )}
            {type === "select" && (
              <div className="field">
                <span>{t("selectOptions")}</span>
                <div className="option-builder option-builder-fixed">
                  {options.map((o, i) => (
                    <div className="option-row" key={i}>
                      <InputControl
                        value={o}
                        onChange={(e) =>
                          setOptions((xs) =>
                            xs.map((x, j) => (j === i ? e.target.value : x)),
                          )
                        }
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() =>
                          setOptions((xs) => xs.filter((_, j) => j !== i))
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
                    <Plus />
                    {t("addOption")}
                  </button>
                </div>
              </div>
            )}
            {type === "image" && (
              <div className="form-grid two">
                <label className="field">
                  {t("widthPx")}
                  <InputControl
                    type="number"
                    min="32"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(+e.target.value)}
                  />
                </label>
                <label className="field">
                  {t("heightPx")}
                  <InputControl
                    type="number"
                    min="32"
                    value={imageHeight ?? ""}
                    onChange={(e) =>
                      setImageHeight(
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </label>
                <label className="field">
                  {t("placement")}
                  <SelectControl
                    value={imageAlign}
                    onChange={(e) =>
                      setImageAlign(e.target.value as typeof imageAlign)
                    }
                  >
                    <option value="inline">{t("inline")}</option>
                    <option value="left">{t("leftWrap")}</option>
                    <option value="center">{t("center")}</option>
                    <option value="right">{t("rightWrap")}</option>
                  </SelectControl>
                </label>
                <label className="field">
                  {t("imageFit")}
                  <SelectControl
                    value={imageFit}
                    onChange={(e) =>
                      setImageFit(e.target.value as typeof imageFit)
                    }
                  >
                    <option value="contain">{t("contain")}</option>
                    <option value="cover">{t("cover")}</option>
                    <option value="fill">fill</option>
                  </SelectControl>
                </label>
              </div>
            )}
          </section>

          <details className="variable-section">
            <summary>{t("validationSettings")}</summary>
            <div className="variable-section-body">
              <label className="check-row">
                <InputControl
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                />
                <span>{t("requiredField")}</span>
              </label>
              {required && (
                <label className="field">
                  {t("requiredMessage")}
                  <InputControl
                    value={requiredMessage}
                    onChange={(e) => setRequiredMessage(e.target.value)}
                  />
                </label>
              )}
              {type === "text" && (
                <div className="form-grid two">
                  <label className="field">
                    {t("minLength")}
                    <InputControl
                      type="number"
                      min="0"
                      value={minLength}
                      onChange={(e) => setMinLength(num0(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    {t("maxLength")}
                    <InputControl
                      type="number"
                      min="0"
                      value={maxLength}
                      onChange={(e) => setMaxLength(num0(e.target.value))}
                    />
                  </label>
                </div>
              )}
              {type === "number" && (
                <div className="form-grid two">
                  <label className="field">
                    {t("minNumber")}
                    <InputControl
                      type="number"
                      min="0"
                      value={minNumber}
                      onChange={(e) => setMinNumber(num0(e.target.value))}
                    />
                  </label>
                  <label className="field">
                    {t("maxNumber")}
                    <InputControl
                      type="number"
                      min="0"
                      value={maxNumber}
                      onChange={(e) => setMaxNumber(num0(e.target.value))}
                    />
                  </label>
                </div>
              )}
              {["date", "datetime"].includes(type) && (
                <div className="form-grid two">
                  <label className="field">
                    {t("minDate")}
                    <InputControl
                      type={type === "datetime" ? "datetime-local" : "date"}
                      value={minDate}
                      onChange={(e) => setMinDate(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t("maxDate")}
                    <InputControl
                      type={type === "datetime" ? "datetime-local" : "date"}
                      value={maxDate}
                      onChange={(e) => setMaxDate(e.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          </details>
          {type !== "image" && (
            <details className="variable-section">
              <summary>{t("variableStyle")}</summary>
              <div className="variable-section-body">
                <div className="form-grid two">
                  <label className="field">
                    {t("fontSize")}
                    <InputControl
                      type="number"
                      min="8"
                      max="96"
                      value={fontSize}
                      onChange={(e) => setFontSize(+e.target.value)}
                    />
                  </label>
                  <label className="field">
                    {t("textColor")}
                    <InputControl
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </label>
                </div>
                <div className="variable-style-toolbar">
                  <button
                    type="button"
                    className={bold ? "active" : undefined}
                    aria-pressed={bold}
                    onClick={toggle(bold, setBold)}
                    title={t("bold")}
                  >
                    <Bold />
                  </button>
                  <button
                    type="button"
                    className={italic ? "active" : undefined}
                    aria-pressed={italic}
                    onClick={toggle(italic, setItalic)}
                    title={t("italic")}
                  >
                    <Italic />
                  </button>
                  <button
                    type="button"
                    className={underline ? "active" : undefined}
                    aria-pressed={underline}
                    onClick={toggle(underline, setUnderline)}
                    title={t("underline")}
                  >
                    <Underline />
                  </button>
                </div>
              </div>
            </details>
          )}
          <div className="variable-example">
            {t("result")}: <code>{`{{${generatedName || "variable"}}}`}</code>
          </div>
        </div>
        <div className="dialog-actions variable-dialog-actions">
          <button className="btn secondary" onClick={onClose}>
            {t("cancel")}
          </button>
          <button
            className="btn"
            onClick={submit}
            disabled={!generatedName || !label.trim() || duplicate}
          >
            {initial ? t("saveVariableChanges") : t("insertVariable")}
          </button>
        </div>
      </div>
    </div>
  );
}
