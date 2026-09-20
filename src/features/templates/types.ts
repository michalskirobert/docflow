export type VariableType = "text" | "date" | "image" | "select";
export type TemplateVariable = {
  name: string;
  label?: string;
  type: VariableType;
  required?: boolean;
  requiredMessage?: string;
  mask?: string;
  dateFormat?: string;
  options?: string[];
  imageWidth?: number;
  imageHeight?: number;
};
export type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  variablesJson: string;
  isExample: boolean;
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
