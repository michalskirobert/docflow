export type VariableType =
  "text" | "number" | "date" | "datetime" | "time" | "image" | "select" | "formula";
export type TemplateVariable = {
  name: string;
  label?: string;
  placeholder?: string;
  tooltip?: string;
  type: VariableType;
  formula?: string;
  required?: boolean;
  requiredMessage?: string;
  mask?: string;
  minLength?: number;
  maxLength?: number;
  minNumber?: number;
  maxNumber?: number;
  minDate?: string;
  maxDate?: string;
  defaultValue?: string;
  defaultValueMode?: "fixed" | "current";
  locked?: boolean;
  decimalPlaces?: number;
  decimalSeparator?: "." | ",";
  thousandsSeparator?: "none" | "." | "," | "space";
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  dateFormat?: string;
  options?: string[];
  imageWidth?: number;
  imageHeight?: number;
  imageAlign?: "inline" | "left" | "center" | "right";
  imageFit?: "contain" | "cover" | "fill";
};
export type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  variablesJson: string;
  isExample?: boolean;
  emailSubject?: string | null;
  createdAt: string;
};

export type Template = TemplateSummary & {
  content: string;
  headerContent?: string | null;
  footerContent?: string | null;
  pageNumbers?: boolean;
  createdAt: string;
};
export function parseTemplateVariables(value: string): TemplateVariable[] {
  try {
    const parsed = JSON.parse(value) as unknown[];
    return parsed.map((item) =>
      typeof item === "string"
        ? { name: item, type: "text" as const }
        : (item as TemplateVariable),
    );
  } catch {
    return [];
  }
}
