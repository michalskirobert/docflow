"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { TemplateVariable } from "@/features/templates/types";
import { resolveCalculatedValues } from "@/features/templates/calculations";
import { formatTemplateNumber } from "@/features/templates/number-format";
import { parseTableRows } from "@/features/templates/data-table";
import { validateVariable } from "../helpers";
import { VariableField } from "./VariableField";

export function DataTableField({
  table,
  variables,
  value,
  globalValues,
  error,
  onChange,
}: {
  table: TemplateVariable;
  variables: TemplateVariable[];
  value: string;
  globalValues: Record<string, string>;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [draggedRow, setDraggedRow] = useState<number | null>(null);
  const [dropTargetRow, setDropTargetRow] = useState<number | null>(null);
  const columns = table.dataTable?.columns ?? [];
  const defs = new Map(variables.map((item) => [item.name, item]));
  const rows = parseTableRows(value);
  const minRows = Math.max(
    table.required ? 1 : 0,
    table.dataTable?.minRows ?? 0,
  );
  const maxRows = table.dataTable?.maxRows;
  const update = (next: Record<string, string>[]) =>
    onChange(JSON.stringify(next));
  const addRow = () => {
    if (maxRows !== undefined && rows.length >= maxRows) return;
    update([
      ...rows,
      Object.fromEntries(
        columns.flatMap((column) =>
          column.variableName
            ? [
                [
                  column.variableName,
                  defs.get(column.variableName)?.defaultValue ?? "",
                ],
              ]
            : [],
        ),
      ),
    ]);
  };
  const moveRow = (from: number, to: number) => {
    if (from === to) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    update(next);
  };

  return (
    <div className={`field data-table-field ${error ? "field-error" : ""}`}>
      <div className="data-table-field-heading">
        <div>
          <strong>{table.label || table.name}</strong>
          {(table.required || minRows > 0) && (
            <span className="required"> *</span>
          )}
          <code>{`{{${table.name}}}`}</code>
        </div>
        <small>
          {minRows > 0 ? `Minimum rows: ${minRows}` : "Add rows as needed."}
        </small>
      </div>
      <div className="data-table-scroll" tabIndex={0}>
        <table className="document-data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  style={{
                    minWidth: Math.max(80, column.width ?? 150),
                    width: Math.max(80, column.width ?? 150),
                  }}
                >
                  {column.label ||
                    (column.variableName
                      ? defs.get(column.variableName)?.label
                      : undefined) ||
                    "Column"}
                </th>
              ))}
              <th className="data-table-actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="data-table-empty-row">
                <td colSpan={Math.max(1, columns.length + 1)}>
                  <div className="data-table-empty-message">
                    <div>
                      <strong>No data</strong>
                      <span>
                        Add the first row to start filling this table.
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                let resolved: Record<string, string | number> = {
                  ...globalValues,
                  ...row,
                };
                try {
                  resolved = resolveCalculatedValues(
                    variables.filter((v) => v.type !== "dataTable"),
                    resolved,
                  );
                } catch {}
                return (
                  <tr
                    key={rowIndex}
                    className={`${draggedRow === rowIndex ? "is-dragging" : ""} ${dropTargetRow === rowIndex && draggedRow !== rowIndex ? "is-drop-target" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropTargetRow(rowIndex);
                    }}
                    onDragLeave={() =>
                      setDropTargetRow((current) =>
                        current === rowIndex ? null : current,
                      )
                    }
                    onDrop={() => {
                      if (draggedRow !== null) moveRow(draggedRow, rowIndex);
                      setDraggedRow(null);
                      setDropTargetRow(null);
                    }}
                  >
                    {columns.map((column) => {
                      if (!column.variableName)
                        return (
                          <td key={column.id}>
                            <div className="data-table-static-text">
                              {column.staticText || "—"}
                            </div>
                          </td>
                        );
                      const variable = defs.get(column.variableName);
                      if (!variable) return <td key={column.id}>—</td>;
                      if (variable.type === "formula") {
                        const result = resolved[variable.name];
                        return (
                          <td key={column.id}>
                            <div
                              className="data-table-calculated"
                              title={variable.label || variable.name}
                            >
                              {typeof result === "number"
                                ? formatTemplateNumber(result, variable)
                                : "—"}
                            </div>
                          </td>
                        );
                      }
                      const cellError = validateVariable(
                        variable,
                        row[variable.name] ?? "",
                      );
                      return (
                        <td key={column.id}>
                          <VariableField
                            variable={variable}
                            value={row[variable.name] ?? ""}
                            error={cellError}
                            compact
                            hideLabel
                            onChange={(nextValue) =>
                              update(
                                rows.map((item, index) =>
                                  index === rowIndex
                                    ? { ...item, [variable.name]: nextValue }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                      );
                    })}
                    <td className="data-table-actions-column">
                      <div className="data-table-row-actions">
                        <button
                          type="button"
                          className="icon-button danger data-table-delete-row"
                          aria-label="Delete row"
                          disabled={rows.length <= minRows}
                          onClick={() =>
                            update(
                              rows.filter((_, index) => index !== rowIndex),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                        <button
                          type="button"
                          className="data-table-drag-handle"
                          aria-label="Reorder row"
                          draggable
                          onDragStart={(event) => {
                            setDraggedRow(rowIndex);
                            const rowElement =
                              event.currentTarget.closest("tr");
                            if (rowElement)
                              event.dataTransfer.setDragImage(
                                rowElement,
                                24,
                                24,
                              );
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => {
                            setDraggedRow(null);
                            setDropTargetRow(null);
                          }}
                        >
                          <GripVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {error && <small className="form-error">{error}</small>}
      <button
        type="button"
        className="btn secondary compact data-table-add-row"
        disabled={maxRows !== undefined && rows.length >= maxRows}
        title={
          maxRows !== undefined && rows.length >= maxRows
            ? `Maximum rows: ${maxRows}`
            : undefined
        }
        onClick={addRow}
      >
        <Plus size={16} /> Add row
      </button>
    </div>
  );
}
