import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pencil,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
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

type DragState = {
  index: number;
  pointerId: number;
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
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  const setActiveDropIndex = (index: number | null) => {
    dropIndexRef.current = index;
    setDropIndex(index);
  };

  const clearDrag = () => {
    dragRef.current = null;
    setDragIndex(null);
    setActiveDropIndex(null);
  };

  const finishReorder = () => {
    const drag = dragRef.current;
    const to = dropIndexRef.current;

    if (!drag || to === null) {
      clearDrag();
      return;
    }

    const from = drag.index;

    let destination = to;

    if (from < to) {
      destination = to - 1;
    }

    if (destination !== from) {
      reorderVariable(from, destination);
    }

    clearDrag();
  };

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      event.preventDefault();

      const element = document.elementFromPoint(event.clientX, event.clientY);

      const dropZone = element?.closest<HTMLElement>(
        "[data-variable-drop-index]",
      );

      if (!dropZone) {
        setActiveDropIndex(null);
        return;
      }

      const rawIndex = dropZone.dataset.variableDropIndex;

      const index = rawIndex === undefined ? Number.NaN : Number(rawIndex);

      if (!Number.isInteger(index)) {
        setActiveDropIndex(null);
        return;
      }

      if (dropIndexRef.current !== index) {
        setActiveDropIndex(index);
      }
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      finishReorder();
    };

    const handlePointerCancel = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      clearDrag();
    };

    document.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });

    document.addEventListener("pointerup", handlePointerUp);

    document.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);

      document.removeEventListener("pointerup", handlePointerUp);

      document.removeEventListener("pointercancel", handlePointerCancel);
    };
  });

  const startReorder = (event: PointerEvent<HTMLDivElement>, index: number) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    dragRef.current = {
      index,
      pointerId: event.pointerId,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    setDragIndex(index);
    setActiveDropIndex(null);
  };

  function DropZone({ index }: { index: number }) {
    const isDragOver = dropIndex === index && dragIndex !== null;

    return (
      <div
        className={`variable-drop-zone ${
          dragIndex !== null ? "active" : ""
        } ${isDragOver ? "drag-over" : ""}`}
        data-variable-drop-index={index}
        aria-hidden="true"
      >
        {isDragOver && (
          <span className="variable-drop-ghost" aria-hidden="true">
            <GripVertical size={14} aria-hidden="true" />

            <span className="variable-drop-ghost-line" />
          </span>
        )}

        <span className="variable-drop-indicator" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="variable-shelf">
      <strong>{t("variables")}</strong>

      <div className="variable-shelf-list">
        <DropZone index={0} />

        {variables.map((variable, index) => (
          <div className="variable-shelf-item" key={variable.name}>
            <div className="variable-chip">
              <div
                className={`variable-drag-handle ${
                  dragIndex === index ? "dragging" : ""
                }`}
                aria-hidden="true"
                onPointerDown={(event) => startReorder(event, index)}
              >
                <GripVertical size={18} aria-hidden="true" />
              </div>

              <button
                type="button"
                onMouseDown={rememberSelection}
                onClick={() => insertVariable(variable)}
                title={`{{${variable.name}}}`}
              >
                <span>{`{{${variable.name}}}`}</span>
              </button>

              <div className="variable-reorder-actions">
                <button
                  type="button"
                  aria-label={t("moveVariableUp")}
                  disabled={index === 0}
                  onClick={() => reorderVariable(index, index - 1)}
                >
                  <ChevronLeft />
                </button>

                <button
                  type="button"
                  aria-label={t("moveVariableDown")}
                  disabled={index === variables.length - 1}
                  onClick={() => reorderVariable(index, index + 1)}
                >
                  <ChevronRight />
                </button>
              </div>

              <button
                type="button"
                aria-label={t("editVariable")}
                title={t("editVariable")}
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

            <DropZone index={index + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
