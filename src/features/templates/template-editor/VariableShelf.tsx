import { Pencil, X } from "lucide-react";
import type { TemplateVariable } from "../types";
type Props = {
  t: (key: string) => string;
  variables: TemplateVariable[];
  rememberSelection: () => void;
  insertVariable: (v: TemplateVariable) => void;
  editVariable: (v: TemplateVariable) => void;
  removeVariable: (name: string) => void;
};
export function VariableShelf({
  t,
  variables,
  rememberSelection,
  insertVariable,
  editVariable,
  removeVariable,
}: Props) {
  return (
    <div className="variable-shelf">
      <strong>{t("variables")}</strong>
      <div className="variable-shelf-list">
        {variables.map((variable) => (
          <div
            className="variable-chip"
            key={variable.name}
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData("text/docflow-variable", variable.name)
            }
          >
            <button
              type="button"
              onMouseDown={rememberSelection}
              onClick={() => insertVariable(variable)}
            >{`{{${variable.name}}}`}</button>
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
        ))}
      </div>
    </div>
  );
}
