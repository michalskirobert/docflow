export type VariableType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "time"
  | "image"
  | "select"
  | "formula"
  | "dataTable";
export type DataTableColumn = {
  id: string;
  label?: string;
  variableName?: string;
  staticText?: string;
  width?: number;
};
export type DataTableDefinition = {
  columns: DataTableColumn[];
  minRows?: number;
  maxRows?: number;
};
export type CalculationOperation = "sum" | "avg" | "min" | "max" | "count";
export type CalculationDefinition =
  | { mode: "formula" }
  | {
      mode: "fields";
      operation: CalculationOperation;
      sourceVariableNames: string[];
    }
  | {
      mode: "repeated";
      operation: CalculationOperation;
      dataTableName: string;
      sourceVariableName: string;
    };
export type TemplateVariable = {
  name: string;
  label?: string;
  placeholder?: string;
  tooltip?: string;
  type: VariableType;
  formula?: string;
  calculation?: CalculationDefinition;
  dataTable?: DataTableDefinition;
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
  numberFormat?: "number" | "currency" | "percentage" | "measure" | "quantity";
  numberLocale?: string;
  currency?: string;
  unit?: string;
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
