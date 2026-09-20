import { ChevronDown, ChevronUp, GripVertical, Pencil, X } from "lucide-react";
import { useState, type DragEvent } from "react";
import type { TemplateVariable } from "../types";

type Props = {
  t: (key: string) => string;
  variables: TemplateVariable[];
  rememberSelection: () => void;
  insertVariable: (v: TemplateVariable) => void;
  editVariable: (v: TemplateVariable) => void;
  removeVariable: (name: string) => void;
  reorderVariable: (from: number, to: number) => void;
};

export function VariableShelf({
  t,
  variables,
  rememberSelection,
  insertVariable,
  editVariable,
  removeVariable,
  reorderVariable,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const startReorder = (event: DragEvent, index: number) => {
    setDragIndex(index);
    event.dataTransfer.setData("text/docflow-variable-index", String(index));
    event.dataTransfer.setData("text/docflow-variable", variables[index].name);
    event.dataTransfer.effectAllowed = "copyMove";
  };
  const dropReorder = (event: DragEvent, to: number) => {
    const raw = event.dataTransfer.getData("text/docflow-variable-index");
    if (!raw) return;
    event.preventDefault();
    event.stopPropagation();
    reorderVariable(Number(raw), to);
    setDragIndex(null);
  };
  return (
    <div className="variable-shelf">
      <strong>{t("variables")}</strong>
      <div className="variable-shelf-list">
        <div
          className={`variable-drop-zone ${dragIndex !== null ? "active" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => dropReorder(e, 0)}
          aria-hidden="true"
        />
        {variables.map((variable, index) => (
          <div className="variable-shelf-item" key={variable.name}>
            <div
              className="variable-chip"
              draggable
              onDragStart={(e) => startReorder(e, index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropReorder(e, index)}
            >
              <GripVertical size={14} aria-hidden="true" />
              <button
                type="button"
                onMouseDown={rememberSelection}
                onClick={() => insertVariable(variable)}
              >{`{{${variable.name}}}`}</button>
              <button
                type="button"
                aria-label="Move variable up"
                disabled={index === 0}
                onClick={() => reorderVariable(index, index - 1)}
              >
                <ChevronUp />
              </button>
              <button
                type="button"
                aria-label="Move variable down"
                disabled={index === variables.length - 1}
                onClick={() => reorderVariable(index, index + 1)}
              >
                <ChevronDown />
              </button>
              <button
                type="button"
                aria-label="Edit variable"
                title="Edit variable"
                onClick={() => editVariable(variable)}
              >
                <Pencil />
              </button>
              <button
                type="button"
                aria-label={t("removeVariable")}
                onClick={() => removeVariable(variable.name)}
              >
                <X />
              </button>
            </div>
            <div
              className={`variable-drop-zone ${dragIndex !== null ? "active" : ""}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropReorder(e, index + 1)}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
