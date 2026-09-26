import { parse } from "mathjs";
import type { TemplateVariable } from "./types";
import { parseTemplateNumber } from "./number-format";

export class FormulaError extends Error {}

const TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const ALLOWED_OPERATORS = new Set(["+", "-", "*", "/", "%"]);

export function formulaDependencies(expression: string): string[] {
  return [...expression.matchAll(TOKEN)].map((match) => match[1]);
}

function normalizedExpression(expression: string) {
  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
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
          throw new FormulaError(`Operator \"${op}\" is not supported.`);
        return;
      }
      throw new FormulaError(
        `Expression element \"${child.type}\" is not supported.`,
      );
    });
    const symbols = new Set(formulaDependencies(expression));
    let unknown: string | undefined;
    node.traverse((child) => {
      if (
        child.type === "SymbolNode" &&
        !symbols.has((child as { name: string }).name)
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

export function evaluateFormula(
  expression: string,
  values: Record<string, string | number>,
): number {
  const scope: Record<string, number> = {};
  for (const name of formulaDependencies(expression)) {
    const raw = values[name];
    const value =
      typeof raw === "number"
        ? raw
        : Number(
            String(raw ?? "")
              .replace(/\s/g, "")
              .replace(",", "."),
          );
    if (!Number.isFinite(value))
      throw new FormulaError(`Variable \"${name}\" has no numeric value.`);
    scope[name] = value;
  }
  const result = parse(normalizedExpression(expression)).evaluate(scope);
  if (typeof result !== "number" || !Number.isFinite(result))
    throw new FormulaError("Formula result is not a finite number.");
  return result;
}

export function resolveCalculatedValues(
  variables: TemplateVariable[],
  input: Record<string, string | number>,
) {
  const values = { ...input };
  const formulas = new Map(
    variables.filter((v) => v.type === "formula").map((v) => [v.name, v]),
  );
  const resolving = new Set<string>();
  const resolved = new Set<string>();
  const resolve = (name: string): number => {
    if (resolved.has(name)) return Number(values[name]);
    if (resolving.has(name))
      throw new FormulaError(`Circular calculation dependency: ${name}`);
    const variable = formulas.get(name);
    if (!variable?.formula)
      throw new FormulaError(`Formula is missing for ${name}.`);
    const validationError = validateFormula(variable.formula, variables, name);
    if (validationError) throw new FormulaError(validationError);
    resolving.add(name);
    for (const dependency of formulaDependencies(variable.formula)) {
      if (formulas.has(dependency)) {
        values[dependency] = resolve(dependency);
        continue;
      }
      const dependencyVariable = variables.find(
        (item) => item.name === dependency,
      );
      if (dependencyVariable?.type === "number") {
        const parsed = parseTemplateNumber(
          values[dependency] ?? "",
          dependencyVariable,
        );
        if (!Number.isFinite(parsed))
          throw new FormulaError(
            `Variable "${dependency}" has no numeric value.`,
          );
        values[dependency] = parsed;
      }
    }
    const result = evaluateFormula(variable.formula, values);
    resolving.delete(name);
    resolved.add(name);
    values[name] = result;
    return result;
  };
  for (const name of formulas.keys()) resolve(name);
  return values;
}
