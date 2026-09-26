"use client";
import {
  ChoiceField,
  InputControl,
  SelectControl,
} from "@/components/shared/form";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { validateFormula } from "../calculations";

const makeTag = (value: string) => {
  const base = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^[0-9]+/, "");

  if (!base) return "";
  if (base.length >= 3) return base;
  return `${base}Var`.slice(0, Math.max(3, base.length + 3));
};
const optionalNumber = (value: string) => {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function VariableModal({
  onClose,
  onInsert,
  t,
  initial,
  existingVariables,
}: {
  onClose: () => void;
  onInsert: (v: TemplateVariable, insertIntoWorkspace: boolean) => void;
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
  const [placeholder, setPlaceholder] = useState(initial?.placeholder ?? "");
  const [formula, setFormula] = useState(initial?.formula ?? "");
  const [insertIntoWorkspace, setInsertIntoWorkspace] = useState(true);
  const formulaRef = useRef<HTMLInputElement>(null);
  const [tooltip, setTooltip] = useState(initial?.tooltip ?? "");
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
  useEffect(() => {
    const allowed =
      type === "date"
        ? ["DD.MM.YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]
        : type === "datetime"
          ? ["DD.MM.YYYY HH:mm", "YYYY-MM-DD HH:mm", "DD/MM/YYYY HH:mm"]
          : type === "time"
            ? ["HH:mm", "HH:mm:ss"]
            : [];
    if (allowed.length && !allowed.includes(dateFormat))
      setDateFormat(allowed[0]);
  }, [type, dateFormat]);
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
  const [minLength, setMinLength] = useState(
    initial?.minLength?.toString() ?? "",
  );
  const [maxLength, setMaxLength] = useState(
    initial?.maxLength?.toString() ?? "",
  );
  const [minNumber, setMinNumber] = useState(
    initial?.minNumber?.toString() ?? "",
  );
  const [maxNumber, setMaxNumber] = useState(
    initial?.maxNumber?.toString() ?? "",
  );
  const [decimalPlaces, setDecimalPlaces] = useState(
    initial?.decimalPlaces?.toString() ?? "",
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
  const formulaError =
    type === "formula"
      ? validateFormula(
          formula,
          existingVariables,
          initial?.name ?? generatedName,
        )
      : null;
  const numericVariables = existingVariables.filter(
    (v) =>
      v.name !== initial?.name && (v.type === "number" || v.type === "formula"),
  );
  const insertFormulaPart = (part: string) => {
    const input = formulaRef.current;
    const start = input?.selectionStart ?? formula.length;
    const end = input?.selectionEnd ?? start;
    const next = `${formula.slice(0, start)}${part}${formula.slice(end)}`;
    setFormula(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + part.length, start + part.length);
    });
  };
  const submit = () => {
    if (!label.trim() || !generatedName || duplicate || formulaError) return;
    const nextDefault =
      hasDefault && defaultValueMode === "fixed" ? defaultValue : undefined;
    onInsert(
      {
        name: generatedName,
        label: label.trim(),
        placeholder: placeholder.trim() || undefined,
        tooltip: tooltip.trim() || undefined,
        type,
        formula: type === "formula" ? formula.trim() || undefined : undefined,
        defaultValue: nextDefault,
        defaultValueMode:
          hasDefault && ["date", "datetime", "time"].includes(type)
            ? defaultValueMode
            : undefined,
        locked: type === "formula" ? true : locked,
        required,
        requiredMessage: required ? requiredMessage : undefined,
        mask: type === "text" && mask ? mask : undefined,
        minLength: type === "text" ? optionalNumber(minLength) : undefined,
        maxLength: type === "text" ? optionalNumber(maxLength) : undefined,
        minNumber: type === "number" ? optionalNumber(minNumber) : undefined,
        maxNumber: type === "number" ? optionalNumber(maxNumber) : undefined,
        decimalPlaces: ["number", "formula"].includes(type)
          ? optionalNumber(decimalPlaces)
          : undefined,
        decimalSeparator: ["number", "formula"].includes(type)
          ? decimalSeparator
          : undefined,
        thousandsSeparator: ["number", "formula"].includes(type)
          ? thousandsSeparator
          : undefined,
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
      },
      initial ? false : insertIntoWorkspace,
    );
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
                  disabled={Boolean(initial)}
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
                  <option value="formula">{t("typeFormula")}</option>
                </SelectControl>
              </label>
              <label className="field">
                <span className="field-label-with-help">
                  {t("variablePlaceholder")}
                  <HelpTooltip text={t("variablePlaceholderHelp")} />
                </span>
                <InputControl
                  value={placeholder}
                  maxLength={180}
                  placeholder={t("variablePlaceholderExample")}
                  onChange={(e) => setPlaceholder(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label-with-help">
                  {t("variableTooltip")}
                  <HelpTooltip text={t("variableTooltipHelp")} />
                </span>
                <InputControl
                  value={tooltip}
                  maxLength={300}
                  placeholder={t("variableTooltipExample")}
                  onChange={(e) => setTooltip(e.target.value)}
                />
              </label>
              {type !== "image" && type !== "formula" && (
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
            {hasDefault && type !== "image" && type !== "formula" && (
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
            <div className="check-row">
              <ChoiceField
                type="checkbox"
                checked={type === "formula" ? true : locked}
                disabled={type === "formula"}
                onChange={(e) => setLocked(e.target.checked)}
                label={t("lockedField")}
              />
              <HelpTooltip text={t("lockedFieldHelp")} />
            </div>
            {!initial && (
              <div className="formula-workspace-option">
                <ChoiceField
                  type="checkbox"
                  checked={insertIntoWorkspace}
                  onChange={(e) => setInsertIntoWorkspace(e.target.checked)}
                  label={t("addToWorkspace")}
                />
                <small>{t("addToWorkspaceHelp")}</small>
              </div>
            )}
          </section>

          <section className="variable-form-section">
            <h4>{t("fieldSettings")}</h4>
            {type === "formula" && (
              <div className={`field ${formulaError ? "field-error" : ""}`}>
                <span className="field-label-with-help">
                  {t("formulaExpression")}
                  <HelpTooltip text={t("formulaExpressionHelp")} />
                </span>
                <InputControl
                  ref={formulaRef}
                  value={formula}
                  maxLength={500}
                  placeholder={t("formulaExpressionExample")}
                  onChange={(e) => setFormula(e.target.value)}
                />
                <div className="formula-toolbar">
                  <select
                    aria-label={t("formulaAvailableVariables")}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value)
                        insertFormulaPart(`{{${e.target.value}}}`);
                      e.target.value = "";
                    }}
                  >
                    <option value="">{t("formulaInsertVariable")}</option>
                    {numericVariables.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.label || v.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={t("formulaInsertOperator")}
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) insertFormulaPart(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="">{t("formulaInsertOperator")}</option>
                    <option value=" + ">+</option>
                    <option value=" - ">−</option>
                    <option value=" * ">×</option>
                    <option value=" / ">÷</option>
                    <option value=" % ">%</option>
                    <option value="(">(</option>
                    <option value=")">)</option>
                  </select>
                </div>
                {formula && (
                  <small
                    className={formulaError ? "field-error" : "formula-valid"}
                  >
                    {formulaError || t("formulaValid")}
                  </small>
                )}
              </div>
            )}

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
            {["number", "formula"].includes(type) && (
              <div className="form-grid two">
                <label className="field">
                  {t("decimalPlaces")}
                  <InputControl
                    type="number"
                    min="0"
                    max="12"
                    inputMode="numeric"
                    value={decimalPlaces}
                    onChange={(e) => setDecimalPlaces(e.target.value)}
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
                  {type === "date"
                    ? [
                        <option key="dmy-dot" value="DD.MM.YYYY">
                          DD.MM.YYYY
                        </option>,
                        <option key="ymd" value="YYYY-MM-DD">
                          YYYY-MM-DD
                        </option>,
                        <option key="dmy-slash" value="DD/MM/YYYY">
                          DD/MM/YYYY
                        </option>,
                      ]
                    : type === "datetime"
                      ? [
                          <option key="dmy-dot-time" value="DD.MM.YYYY HH:mm">
                            DD.MM.YYYY HH:mm
                          </option>,
                          <option key="ymd-time" value="YYYY-MM-DD HH:mm">
                            YYYY-MM-DD HH:mm
                          </option>,
                          <option key="dmy-slash-time" value="DD/MM/YYYY HH:mm">
                            DD/MM/YYYY HH:mm
                          </option>,
                        ]
                      : [
                          <option key="hm" value="HH:mm">
                            HH:mm
                          </option>,
                          <option key="hms" value="HH:mm:ss">
                            HH:mm:ss
                          </option>,
                        ]}
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

          {type !== "formula" && (
            <details className="variable-section">
              <summary>{t("validationSettings")}</summary>
              <div className="variable-section-body">
                <div className="check-row">
                  <ChoiceField
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    label={t("requiredField")}
                  />
                </div>
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
                        onChange={(e) => setMinLength(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      {t("maxLength")}
                      <InputControl
                        type="number"
                        min="0"
                        value={maxLength}
                        onChange={(e) => setMaxLength(e.target.value)}
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
                        onChange={(e) => setMinNumber(e.target.value)}
                      />
                    </label>
                    <label className="field">
                      {t("maxNumber")}
                      <InputControl
                        type="number"
                        min="0"
                        value={maxNumber}
                        onChange={(e) => setMaxNumber(e.target.value)}
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
          )}
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
          <span
            className="disabled-action-reason"
            title={
              !label.trim()
                ? t("variableNameRequired")
                : !generatedName
                  ? t("variableNameRequired")
                  : duplicate
                    ? t("variableNameRequired")
                    : formulaError || undefined
            }
          >
            <button
              className="btn"
              onClick={submit}
              disabled={
                !generatedName || !label.trim() || duplicate || !!formulaError
              }
            >
              {initial ? t("saveVariableChanges") : t("insertVariable")}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
