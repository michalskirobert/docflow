"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Save, Table2, Trash2, X } from "lucide-react";
import {
  ChoiceField,
  InputControl,
  SelectControl,
} from "@/components/shared/form";
import type { TemplateVariable } from "../types";

const DEFAULT_COLUMN_WIDTH = 230;
const MIN_COLUMN_WIDTH = 120;

function createTableTag(label: string) {
  const words = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";
  const [first, ...rest] = words;
  const tag =
    first.toLowerCase() +
    rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
  return /^\d/.test(tag) ? `table${tag}` : tag;
}

export function DataTableModal({
  variables,
  initial,
  onClose,
  onCreateVariable,
  onEditVariable,
  onDeleteVariable,
  onSave,
}: {
  variables: TemplateVariable[];
  initial?: TemplateVariable;
  onClose: () => void;
  onCreateVariable: (onCreated: (variable: TemplateVariable) => void) => void;
  onEditVariable: (variable: TemplateVariable) => void;
  onDeleteVariable: (variable: TemplateVariable) => void;
  onSave: (variable: TemplateVariable) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "Items");
  const [name, setName] = useState(
    initial?.name ?? createTableTag(initial?.label ?? "Items"),
  );
  const [required, setRequired] = useState(initial?.required ?? false);
  const [minRows, setMinRows] = useState<string>(
    initial?.dataTable?.minRows?.toString() ?? "",
  );
  const [maxRows, setMaxRows] = useState<string>(
    initial?.dataTable?.maxRows?.toString() ?? "",
  );
  const [columns, setColumns] = useState(() =>
    (initial?.dataTable?.columns ?? []).map((column) => ({
      ...column,
      width: Math.max(MIN_COLUMN_WIDTH, column.width ?? DEFAULT_COLUMN_WIDTH),
    })),
  );
  const [removeFromColumn, setRemoveFromColumn] = useState<{
    columnId: string;
    variable: TemplateVariable;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  useEffect(() => {
    setName(createTableTag(label));
  }, [label]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateWidth = () => setCanvasWidth(Math.floor(canvas.clientWidth));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const available = useMemo(() => {
    const seen = new Set<string>();
    return variables.filter((variable) => {
      if (
        variable.type === "dataTable" ||
        variable.type === "image" ||
        !variable.name ||
        seen.has(variable.name)
      )
        return false;
      seen.add(variable.name);
      return true;
    });
  }, [variables]);
  const definitions = useMemo(
    () => new Map(variables.map((variable) => [variable.name, variable])),
    [variables],
  );
  const normalizedName = name.trim();
  const valid =
    normalizedName.length > 0 &&
    label.trim().length > 0 &&
    columns.length > 0 &&
    columns.every(
      (column) =>
        Boolean(column.variableName) || Boolean(column.staticText?.trim()),
    );

  const usedWidth = useMemo(
    () =>
      columns.reduce(
        (sum, column) =>
          sum +
          Math.max(MIN_COLUMN_WIDTH, column.width ?? DEFAULT_COLUMN_WIDTH),
        0,
      ),
    [columns],
  );
  const canAddColumn =
    columns.length === 0 ||
    canvasWidth >= (columns.length + 1) * MIN_COLUMN_WIDTH;

  const addColumn = () => {
    setColumns((current) => {
      if (current.length === 0) {
        return [
          {
            id: crypto.randomUUID(),
            label: "Column 1",
            variableName: "",
            width: DEFAULT_COLUMN_WIDTH,
          },
        ];
      }
      if (canvasWidth < (current.length + 1) * MIN_COLUMN_WIDTH) return current;

      const currentWidths = current.map((column) =>
        Math.max(MIN_COLUMN_WIDTH, column.width ?? DEFAULT_COLUMN_WIDTH),
      );
      const desiredNewWidth = Math.min(
        DEFAULT_COLUMN_WIDTH,
        canvasWidth - current.length * MIN_COLUMN_WIDTH,
      );
      const targetExistingTotal = Math.max(
        current.length * MIN_COLUMN_WIDTH,
        canvasWidth - desiredNewWidth,
      );
      const currentTotal = currentWidths.reduce((sum, width) => sum + width, 0);
      const excess = Math.max(0, currentTotal - targetExistingTotal);
      let remaining = excess;
      const nextWidths = [...currentWidths];

      while (remaining > 0.5) {
        const adjustable = nextWidths
          .map((width, index) => ({ width, index }))
          .filter(({ width }) => width > MIN_COLUMN_WIDTH + 0.5);
        if (!adjustable.length) break;
        const share = remaining / adjustable.length;
        let removed = 0;
        for (const { index } of adjustable) {
          const delta = Math.min(share, nextWidths[index] - MIN_COLUMN_WIDTH);
          nextWidths[index] -= delta;
          removed += delta;
        }
        if (removed < 0.5) break;
        remaining -= removed;
      }

      const resized = current.map((column, index) => ({
        ...column,
        width: Math.round(nextWidths[index]),
      }));
      const occupied = resized.reduce(
        (sum, column) => sum + (column.width ?? MIN_COLUMN_WIDTH),
        0,
      );
      const width = Math.max(
        MIN_COLUMN_WIDTH,
        Math.min(DEFAULT_COLUMN_WIDTH, canvasWidth - occupied),
      );
      return [
        ...resized,
        {
          id: crypto.randomUUID(),
          label: `Column ${current.length + 1}`,
          variableName: "",
          width,
        },
      ];
    });
  };

  const resizeColumn = (columnId: string, startX: number) => {
    const index = columns.findIndex((column) => column.id === columnId);
    if (index < 0) return;
    const leftStart = Math.max(
      MIN_COLUMN_WIDTH,
      columns[index].width ?? DEFAULT_COLUMN_WIDTH,
    );
    const isSingleColumn = columns.length === 1;
    const rightStart =
      !isSingleColumn && index < columns.length - 1
        ? Math.max(
            MIN_COLUMN_WIDTH,
            columns[index + 1].width ?? DEFAULT_COLUMN_WIDTH,
          )
        : 0;
    const pairTotal = leftStart + rightStart;

    const onMove = (event: PointerEvent) => {
      const delta = event.clientX - startX;
      if (isSingleColumn || index === columns.length - 1) {
        const width = Math.round(Math.max(MIN_COLUMN_WIDTH, leftStart + delta));
        setColumns((current) =>
          current.map((column, currentIndex) =>
            currentIndex === index ? { ...column, width } : column,
          ),
        );
        return;
      }
      const leftWidth = Math.round(
        Math.min(
          pairTotal - MIN_COLUMN_WIDTH,
          Math.max(MIN_COLUMN_WIDTH, leftStart + delta),
        ),
      );
      const rightWidth = pairTotal - leftWidth;
      setColumns((current) =>
        current.map((column, currentIndex) => {
          if (currentIndex === index) return { ...column, width: leftWidth };
          if (currentIndex === index + 1)
            return { ...column, width: rightWidth };
          return column;
        }),
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  return (
    <div className="dialog-backdrop">
      <section
        className="dialog data-table-modal data-table-designer"
        role="dialog"
        aria-modal="true"
      >
        <div className="variable-dialog-scroll">
          <header className="modal-header data-table-designer-header">
            <div className="data-table-title-block">
              <span className="data-table-title-icon" aria-hidden="true">
                <Table2 size={22} />
              </span>
              <div>
                <h2>{initial ? "Edit data table" : "Data table"}</h2>
                <p>
                  Design the table visually. Every cell uses the same DocFlow
                  variable with its validation, formatting and calculations.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </button>
          </header>

          <div className="modal-body data-table-designer-body">
            <div className="data-table-settings">
              <label className="field data-table-name-field">
                <span>Table name</span>
                <InputControl
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
                <small className="data-table-inline-tag">
                  {normalizedName
                    ? `{{${normalizedName}}}`
                    : "Tag will be generated automatically"}
                </small>
              </label>
              <div className="data-table-row-rules">
                <ChoiceField
                  type="checkbox"
                  className="data-table-required-row"
                  checked={required}
                  onChange={(event) => setRequired(event.target.checked)}
                  label="At least one row is required"
                />
                <div className="data-table-row-limits">
                  <label className="field compact-number-field">
                    <span>Minimum rows</span>
                    <InputControl
                      type="number"
                      min="0"
                      value={minRows}
                      onChange={(event) => setMinRows(event.target.value)}
                    />
                  </label>
                  <label className="field compact-number-field">
                    <span>Maximum rows</span>
                    <InputControl
                      type="number"
                      min="1"
                      value={maxRows}
                      onChange={(event) => setMaxRows(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="data-table-designer-toolbar">
              <div>
                <strong>Table design</strong>
                <small>
                  Add columns, choose variables and drag column edges to set
                  their width. The row below is the document template.
                </small>
              </div>
              <div className="data-table-designer-actions">
                <button
                  type="button"
                  className="btn secondary compact"
                  onClick={addColumn}
                  disabled={!canAddColumn}
                  title={
                    !canAddColumn
                      ? `There is not enough room for another ${MIN_COLUMN_WIDTH}px column.`
                      : "Add column"
                  }
                >
                  <Plus size={16} /> Add column
                </button>
                <button
                  type="button"
                  className="btn compact"
                  onClick={onCreateVariable}
                >
                  <Plus size={16} /> New variable
                </button>
              </div>
            </div>

            <div ref={canvasRef} className="data-table-designer-canvas">
              {columns.length === 0 ? (
                <button
                  type="button"
                  className="data-table-empty-state"
                  onClick={addColumn}
                >
                  <Plus size={20} />
                  <strong>Add the first column</strong>
                  <span>
                    Then choose an existing variable or create a new one.
                  </span>
                </button>
              ) : (
                <div className="data-table-designer-scroll">
                  <table
                    className="data-table-designer-table"
                    style={{ width: Math.max(canvasWidth, usedWidth) }}
                  >
                    <colgroup>
                      {columns.map((column) => (
                        <col
                          key={column.id}
                          style={{
                            width: column.width ?? DEFAULT_COLUMN_WIDTH,
                          }}
                        />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        {columns.map((column, index) => {
                          const definition = column.variableName
                            ? definitions.get(column.variableName)
                            : undefined;
                          const width = column.width ?? DEFAULT_COLUMN_WIDTH;
                          return (
                            <th
                              key={column.id}
                              style={{
                                width,
                                minWidth: width,
                                maxWidth: width,
                              }}
                            >
                              <div className="data-table-column-header">
                                <InputControl
                                  className="data-table-column-name"
                                  value={column.label ?? `Column ${index + 1}`}
                                  aria-label={`Column ${index + 1} name`}
                                  onChange={(event) =>
                                    setColumns((current) =>
                                      current.map((item) =>
                                        item.id === column.id
                                          ? {
                                              ...item,
                                              label: event.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  className="data-table-column-delete"
                                  title="Remove column"
                                  onClick={() =>
                                    setColumns((current) =>
                                      current.filter(
                                        (item) => item.id !== column.id,
                                      ),
                                    )
                                  }
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <button
                                type="button"
                                className="data-table-column-resizer"
                                aria-label={`Resize column ${index + 1}`}
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  resizeColumn(column.id, event.clientX);
                                }}
                              />
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {columns.map((column) => {
                          const definition = column.variableName
                            ? definitions.get(column.variableName)
                            : undefined;
                          return (
                            <td
                              key={column.id}
                              style={{
                                width: column.width ?? DEFAULT_COLUMN_WIDTH,
                                minWidth: column.width ?? DEFAULT_COLUMN_WIDTH,
                                maxWidth: column.width ?? DEFAULT_COLUMN_WIDTH,
                              }}
                            >
                              {column.staticText !== undefined ? (
                                <div className="data-table-static-editor">
                                  <div className="data-table-content-caption">
                                    Custom text
                                  </div>
                                  <div className="data-table-static-editor-row data-table-custom-text-row">
                                    <InputControl
                                      className="data-table-custom-text-input"
                                      autoFocus
                                      placeholder="Enter text…"
                                      value={column.staticText}
                                      onChange={(event) =>
                                        setColumns((current) =>
                                          current.map((item) =>
                                            item.id === column.id
                                              ? {
                                                  ...item,
                                                  staticText:
                                                    event.target.value,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                    <button
                                      type="button"
                                      className="data-table-custom-text-remove"
                                      onClick={() =>
                                        setColumns((current) =>
                                          current.map((item) =>
                                            item.id === column.id
                                              ? {
                                                  ...item,
                                                  staticText: undefined,
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                      title="Remove static text"
                                      aria-label="Remove static text"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <SelectControl
                                    value={column.variableName ?? ""}
                                    aria-label="Content used in this column"
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setColumns((current) =>
                                        current.map((item) =>
                                          item.id === column.id
                                            ? {
                                                ...item,
                                                variableName: value,
                                                staticText: undefined,
                                              }
                                            : item,
                                        ),
                                      );
                                    }}
                                  >
                                    <option value="">Choose variable…</option>
                                    {available.map((variable) => (
                                      <option
                                        key={variable.name}
                                        value={variable.name}
                                      >
                                        {variable.label || variable.name}
                                      </option>
                                    ))}
                                  </SelectControl>
                                  {definition ? (
                                    <div className="data-table-variable-preview">
                                      <div className="data-table-variable-meta">
                                        <code>{`{{${definition.name}}}`}</code>
                                        <span>
                                          {definition.type === "formula"
                                            ? "Calculated number"
                                            : definition.type}
                                        </span>
                                      </div>
                                      <div className="data-table-variable-actions">
                                        <button
                                          type="button"
                                          className="data-table-variable-edit"
                                          onClick={() =>
                                            onEditVariable(definition)
                                          }
                                          title="Edit variable"
                                          aria-label={`Edit ${definition.label || definition.name}`}
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        <button
                                          type="button"
                                          className="data-table-variable-detach"
                                          onClick={() =>
                                            setRemoveFromColumn({
                                              columnId: column.id,
                                              variable: definition,
                                            })
                                          }
                                          title="Remove variable"
                                          aria-label={`Remove ${definition.label || definition.name}`}
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="data-table-content-actions">
                                      <button
                                        type="button"
                                        className="data-table-create-variable-link"
                                        onClick={() =>
                                          onCreateVariable((variable) => {
                                            setColumns((current) =>
                                              current.map((item) =>
                                                item.id === column.id
                                                  ? {
                                                      ...item,
                                                      variableName:
                                                        variable.name,
                                                      staticText: undefined,
                                                    }
                                                  : item,
                                              ),
                                            );
                                          })
                                        }
                                      >
                                        <Plus size={14} /> Create variable
                                      </button>
                                      <button
                                        type="button"
                                        className="data-table-create-variable-link"
                                        onClick={() =>
                                          setColumns((current) =>
                                            current.map((item) =>
                                              item.id === column.id
                                                ? {
                                                    ...item,
                                                    variableName: "",
                                                    staticText: "",
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      >
                                        <Plus size={14} /> Custom text
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="data-table-template-note">
              <Table2 size={16} aria-hidden="true" />
              <span>
                The row above is the template row. Document users will add the
                actual rows when creating or editing a document.
              </span>
            </div>
          </div>

          <footer className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn"
              disabled={!valid}
              title={
                !valid
                  ? "Add at least one column and assign a variable or static text to every column."
                  : undefined
              }
              onClick={() =>
                onSave({
                  name: normalizedName,
                  label: label.trim(),
                  type: "dataTable",
                  required,
                  dataTable: {
                    columns,
                    minRows: minRows === "" ? undefined : Number(minRows),
                    maxRows: maxRows === "" ? undefined : Number(maxRows),
                  },
                })
              }
            >
              <Save size={16} /> Save table
            </button>
          </footer>
        </div>
      </section>

      {removeFromColumn && (
        <div className="dialog-backdrop data-table-remove-variable-backdrop">
          <section
            className="dialog data-table-remove-variable-dialog"
            role="alertdialog"
            aria-modal="true"
          >
            <h3>Remove variable</h3>
            <p>
              Do you want to remove{" "}
              <strong>
                {removeFromColumn.variable.label ||
                  removeFromColumn.variable.name}
              </strong>{" "}
              only from this table column, or delete the variable permanently
              from the template?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setRemoveFromColumn(null)}
              >
                Back
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setColumns((current) =>
                    current.map((item) =>
                      item.id === removeFromColumn.columnId
                        ? { ...item, variableName: "" }
                        : item,
                    ),
                  );
                  setRemoveFromColumn(null);
                }}
              >
                Remove from table
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  const target = removeFromColumn.variable;
                  setColumns((current) =>
                    current.map((item) =>
                      item.variableName === target.name
                        ? { ...item, variableName: "" }
                        : item,
                    ),
                  );
                  onDeleteVariable(target);
                  setRemoveFromColumn(null);
                }}
              >
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
