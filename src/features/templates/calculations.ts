import { parse } from "mathjs";
import type { TemplateVariable } from "./types";
import { parseTemplateNumber } from "./number-format";
import { parseTableRows } from "./data-table";

export class FormulaError extends Error {}

const TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const ALLOWED_OPERATORS = new Set(["+", "-", "*", "/", "%"]);
const ALLOWED_FUNCTIONS = new Set(["sum", "avg", "min", "max", "count"]);

export function formulaDependencies(expression: string): string[] {
  return [...expression.matchAll(TOKEN)].map((match) => match[1]);
}

function normalizedExpression(expression: string) {
  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/\b(SUM|AVG|MIN|MAX|COUNT)\s*\(/gi, (_, name: string) =>
      `${name.toLowerCase()}(`,
    )
    .replace(TOKEN, (_, name: string) => name);
}

export function validateFormula(
  expression: string,
  variables: TemplateVariable[],
  currentName?: string,
): string | null {
  if (!expression.trim()) return "Formula is required.";
  const byName = new Map(
    variables.map((variable) => [variable.name, variable]),
  );
  for (const name of formulaDependencies(expression)) {
    if (name === currentName)
      return `Variable \"${name}\" cannot reference itself.`;
    const variable = byName.get(name);
    if (!variable) return `Variable \"${name}\" does not exist.`;
    if (variable.type !== "number" && variable.type !== "formula")
      return `Variable \"${name}\" is not numeric.`;
  }
  try {
    const node = parse(normalizedExpression(expression));
    node.traverse((child) => {
      if (
        ["ConstantNode", "SymbolNode", "ParenthesisNode"].includes(child.type)
      )
        return;
      if (child.type === "OperatorNode") {
        const op = (child as { op: string }).op;
        if (!ALLOWED_OPERATORS.has(op))
          throw new FormulaError(`Operator "${op}" is not supported.`);
        return;
      }
      if (child.type === "FunctionNode") {
        const fn = (child as { fn?: { name?: string }; args?: unknown[] }).fn;
        const name = fn?.name?.toLowerCase();
        if (!name || !ALLOWED_FUNCTIONS.has(name))
          throw new FormulaError(`Function "${fn?.name ?? "?"}" is not supported.`);
        const args = (child as { args?: unknown[] }).args ?? [];
        if (args.length === 0)
          throw new FormulaError(`Function "${name.toUpperCase()}" requires at least one value.`);
        return;
      }
      throw new FormulaError(
        `Expression element "${child.type}" is not supported.`,
      );
    });
    const symbols = new Set(formulaDependencies(expression));
    let unknown: string | undefined;
    node.traverse((child) => {
      if (
        child.type === "SymbolNode" &&
        !symbols.has((child as { name: string }).name) &&
        !ALLOWED_FUNCTIONS.has((child as { name: string }).name.toLowerCase())
      )
        unknown = (child as { name: string }).name;
    });
    if (unknown)
      return `Text or unknown symbol \"${unknown}\" is not allowed. Use {{variable}} for variables.`;
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid formula.";
  }
}

export function validateCalculation(variable: TemplateVariable, variables: TemplateVariable[]): string | null {
  if (variable.type !== "formula") return null;
  const calculation = variable.calculation;
  if (!calculation || calculation.mode === "formula")
    return validateFormula(variable.formula ?? "", variables, variable.name);
  const byName = new Map(variables.map((item) => [item.name, item]));
  if (calculation.mode === "fields") {
    if (calculation.sourceVariableNames.length === 0) return "Select at least one numeric field.";
    for (const name of calculation.sourceVariableNames) {
      if (name === variable.name) return `Variable "${name}" cannot reference itself.`;
      const source = byName.get(name);
      if (!source || (source.type !== "number" && source.type !== "formula")) return `Variable "${name}" is not numeric.`;
    }
    return null;
  }
  const table = byName.get(calculation.dataTableName);
  if (!table || table.type !== "dataTable") return "Repeated calculation table does not exist.";
  const source = byName.get(calculation.sourceVariableName);
  if (!source || (source.type !== "number" && source.type !== "formula")) return `Variable "${calculation.sourceVariableName}" is not numeric.`;
  const belongsToTable = table.dataTable?.columns.some((column) => column.variableName === calculation.sourceVariableName);
  return belongsToTable ? null : `Variable "${calculation.sourceVariableName}" is not a column of the selected table.`;
}

export function evaluateFormula(
  expression: string,
  values: Record<string, string | number | number[]>,
): number {
  const scope: Record<string, number | number[]> = {};
  for (const name of formulaDependencies(expression)) {
    const raw = values[name];
    if (Array.isArray(raw)) {
      if (raw.some((item) => !Number.isFinite(item)))
        throw new FormulaError(`Variable "${name}" has no numeric value.`);
      scope[name] = raw;
      continue;
    }
    const value = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value))
      throw new FormulaError(`Variable "${name}" has no numeric value.`);
    scope[name] = value;
  }

  const flatten = (items: Array<number | number[]>): number[] =>
    items.flatMap((item) => (Array.isArray(item) ? item : [item]));

  const evaluateNode = (node: any): number | number[] => {
    if (node.type === "ConstantNode") return Number(node.value);
    if (node.type === "ParenthesisNode") return evaluateNode(node.content);
    if (node.type === "SymbolNode") {
      const value = scope[node.name];
      if (value === undefined) throw new FormulaError(`Variable "${node.name}" has no numeric value.`);
      return value;
    }
    if (node.type === "OperatorNode") {
      const args = node.args.map((arg: any) => evaluateNode(arg));
      if (args.some(Array.isArray)) throw new FormulaError("A repeated field must be used inside SUM, AVG, MIN, MAX or COUNT.");
      const [left, right] = args as number[];
      if (node.op === "+") return left + right;
      if (node.op === "-") return args.length === 1 ? -left : left - right;
      if (node.op === "*") return left * right;
      if (node.op === "/") return left / right;
      if (node.op === "%") return left % right;
      throw new FormulaError(`Operator "${node.op}" is not supported.`);
    }
    if (node.type === "FunctionNode") {
      const name = String(node.fn?.name ?? "").toLowerCase();
      if (!ALLOWED_FUNCTIONS.has(name)) throw new FormulaError(`Function "${name}" is not supported.`);
      const numbers = flatten(node.args.map((arg: any) => evaluateNode(arg)));
      if (name === "count") return numbers.length;
      if (numbers.length === 0) return 0;
      if (name === "sum") return numbers.reduce((total, value) => total + value, 0);
      if (name === "avg") return numbers.reduce((total, value) => total + value, 0) / numbers.length;
      if (name === "min") return Math.min(...numbers);
      if (name === "max") return Math.max(...numbers);
    }
    throw new FormulaError(`Expression element "${node.type}" is not supported.`);
  };

  const result = evaluateNode(parse(normalizedExpression(expression)));
  if (typeof result !== "number" || !Number.isFinite(result))
    throw new FormulaError("Formula result is not a finite number.");
  return result;
}

function aggregate(operation: "sum" | "avg" | "min" | "max" | "count", values: number[]): number {
  if (operation === "count") return values.length;
  if (values.length === 0) return 0;
  if (operation === "sum") return values.reduce((sum, value) => sum + value, 0);
  if (operation === "avg") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (operation === "min") return Math.min(...values);
  return Math.max(...values);
}

function numericValue(raw: unknown, variable: TemplateVariable): number {
  const value = parseTemplateNumber(raw ?? "", variable);
  if (!Number.isFinite(value)) throw new FormulaError(`Variable "${variable.name}" has no numeric value.`);
  return value;
}

export function resolveCalculatedValues(
  variables: TemplateVariable[],
  input: Record<string, string | number>,
  targetNames?: string[],
) {
  const values: Record<string, string | number> = { ...input };
  const formulas = new Map(
    variables.filter((v) => v.type === "formula").map((v) => [v.name, v]),
  );
  const byName = new Map(variables.map((v) => [v.name, v]));
  const tables = variables.filter((v) => v.type === "dataTable");
  const resolving = new Set<string>();
  const resolved = new Set<string>();

  const owningTable = (name: string) =>
    tables.find((table) =>
      table.dataTable?.columns.some((column) => column.variableName === name),
    );

  const resolveRowValue = (
    name: string,
    row: Record<string, string>,
    rowResolving = new Set<string>(),
  ): number => {
    if (rowResolving.has(name))
      throw new FormulaError(`Circular calculation dependency: ${name}`);

    const definition = byName.get(name);
    if (!definition)
      throw new FormulaError(`Variable "${name}" does not exist.`);
    if (definition.type === "number") return numericValue(row[name], definition);
    if (definition.type !== "formula")
      throw new FormulaError(`Variable "${name}" is not numeric.`);

    rowResolving.add(name);
    try {
      const calculation = definition.calculation;
      if (calculation?.mode === "fields") {
        return aggregate(
          calculation.operation,
          calculation.sourceVariableNames.map((dependency) => {
            const dependencyTable = owningTable(dependency);
            return dependencyTable
              ? resolveRowValue(dependency, row, rowResolving)
              : formulas.has(dependency)
                ? resolve(dependency)
                : numericValue(values[dependency], byName.get(dependency)!);
          }),
        );
      }

      if (calculation?.mode === "repeated") return resolve(name);
      if (!definition.formula)
        throw new FormulaError(`Formula is missing for ${name}.`);

      const formulaValues: Record<string, string | number | number[]> = {};
      for (const dependency of formulaDependencies(definition.formula)) {
        const dependencyDefinition = byName.get(dependency);
        if (!dependencyDefinition) continue;
        if (owningTable(dependency)) {
          formulaValues[dependency] = resolveRowValue(
            dependency,
            row,
            rowResolving,
          );
        } else if (dependencyDefinition.type === "formula") {
          formulaValues[dependency] = resolve(dependency);
        } else if (dependencyDefinition.type === "number") {
          formulaValues[dependency] = numericValue(
            values[dependency],
            dependencyDefinition,
          );
        }
      }
      return evaluateFormula(definition.formula, formulaValues);
    } finally {
      rowResolving.delete(name);
    }
  };

  const repeatedValues = (name: string): number[] => {
    const table = owningTable(name);
    if (!table) return [];
    return parseTableRows(String(values[table.name] ?? "[]")).flatMap((row) => {
      try {
        return [resolveRowValue(name, row)];
      } catch {
        return [];
      }
    });
  };

  const resolve = (name: string): number => {
    if (resolved.has(name)) return Number(values[name]);
    if (resolving.has(name))
      throw new FormulaError(`Circular calculation dependency: ${name}`);
    const variable = formulas.get(name);
    if (!variable) throw new FormulaError(`Calculation is missing for ${name}.`);

    resolving.add(name);
    try {
      const calculation = variable.calculation;
      let result: number;
      if (calculation?.mode === "fields") {
        const numbers = calculation.sourceVariableNames.map((dependency) => {
          if (owningTable(dependency)) {
            const repeated = repeatedValues(dependency);
            if (repeated.length !== 1)
              throw new FormulaError(`Repeated variable "${dependency}" must be used with a repeated aggregation.`);
            return repeated[0];
          }
          if (formulas.has(dependency)) return resolve(dependency);
          const definition = byName.get(dependency);
          if (!definition || definition.type !== "number")
            throw new FormulaError(`Variable "${dependency}" is not numeric.`);
          return numericValue(values[dependency], definition);
        });
        result = aggregate(calculation.operation, numbers);
      } else if (calculation?.mode === "repeated") {
        const table = byName.get(calculation.dataTableName);
        const definition = byName.get(calculation.sourceVariableName);
        if (!table || table.type !== "dataTable")
          throw new FormulaError("Repeated calculation table does not exist.");
        if (!definition || (definition.type !== "number" && definition.type !== "formula"))
          throw new FormulaError(`Variable "${calculation.sourceVariableName}" is not numeric.`);
        const rows = parseTableRows(String(values[calculation.dataTableName] ?? "[]"));
        const numbers = rows.flatMap((row) => {
          try {
            return [resolveRowValue(calculation.sourceVariableName, row)];
          } catch {
            return [];
          }
        });
        result = aggregate(calculation.operation, numbers);
      } else {
        if (!variable.formula) throw new FormulaError(`Formula is missing for ${name}.`);
        const validationError = validateFormula(variable.formula, variables, name);
        if (validationError) throw new FormulaError(validationError);
        const formulaValues: Record<string, string | number | number[]> = { ...values };
        for (const dependency of formulaDependencies(variable.formula)) {
          const dependencyVariable = byName.get(dependency);
          if (!dependencyVariable) continue;

          const table = owningTable(dependency);
          if (table) {
            formulaValues[dependency] = repeatedValues(dependency);
          } else if (dependencyVariable.type === "formula") {
            formulaValues[dependency] = resolve(dependency);
          } else if (dependencyVariable.type === "number") {
            formulaValues[dependency] = numericValue(values[dependency], dependencyVariable);
          }
        }
        result = evaluateFormula(variable.formula, formulaValues);
      }
      resolved.add(name);
      values[name] = result;
      return result;
    } finally {
      resolving.delete(name);
    }
  };

  const targets = targetNames?.length
    ? targetNames
    : [...formulas.keys()].filter((name) => !owningTable(name));
  for (const name of targets) {
    if (formulas.has(name)) resolve(name);
  }
  return values;
}
