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
  dropVariableAtPoint: (
    variable: TemplateVariable,
    x: number,
    y: number,
  ) => boolean;
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
  dropVariableAtPoint,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  const setActiveDropIndex = (index: number | null) => {
    dropIndexRef.current = index;
    setDropIndex(index);
  };

  const clearDrag = () => {
    dragRef.current = null;
    setDragIndex(null);
    setPointerPosition(null);
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

      setPointerPosition({ x: event.clientX, y: event.clientY });

      const shelf = document.querySelector<HTMLElement>(".variable-shelf-list");
      const zones = Array.from(
        document.querySelectorAll<HTMLElement>("[data-variable-drop-index]"),
      );
      if (!shelf || zones.length === 0) {
        setActiveDropIndex(null);
        return;
      }
      const shelfRect = shelf.getBoundingClientRect();
      if (
        event.clientY < shelfRect.top - 20 ||
        event.clientY > shelfRect.bottom + 20 ||
        event.clientX < shelfRect.left - 20 ||
        event.clientX > shelfRect.right + 20
      ) {
        setActiveDropIndex(null);
        return;
      }
      let nearestIndex: number | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const zone of zones) {
        const raw = zone.dataset.variableDropIndex;
        const index = raw === undefined ? Number.NaN : Number(raw);
        if (!Number.isInteger(index)) continue;
        const rect = zone.getBoundingClientRect();
        const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
      if (dropIndexRef.current !== nearestIndex)
        setActiveDropIndex(nearestIndex);
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      if (dropIndexRef.current === null) {
        const variable = variables[drag.index];
        if (
          variable &&
          dropVariableAtPoint(variable, event.clientX, event.clientY)
        ) {
          clearDrag();
          return;
        }
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
    setPointerPosition({ x: event.clientX, y: event.clientY });
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

      {dragIndex !== null && pointerPosition && (
        <div
          className="variable-drag-preview"
          style={{ left: pointerPosition.x, top: pointerPosition.y }}
          aria-hidden="true"
        >
          <GripVertical size={16} />
          <span>{`{{${variables[dragIndex]?.name ?? ""}}}`}</span>
        </div>
      )}

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
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "copy";
                  event.dataTransfer.setData(
                    "text/docflow-variable",
                    variable.name,
                  );
                }}
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
                title={t("removeVariable")}
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
