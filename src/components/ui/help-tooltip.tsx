"use client";

import { CircleHelp } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export function HelpTooltip({
  text,
  label = "Help",
}: {
  text: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 280 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const tooltip = tooltipRef.current;
      if (!trigger || !tooltip) return;

      const triggerRect = trigger.getBoundingClientRect();
      const margin = 12;
      const gap = 8;
      const width = Math.min(280, window.innerWidth - margin * 2);
      const height = tooltip.offsetHeight;
      const preferredLeft =
        triggerRect.left + triggerRect.width / 2 - width / 2;
      const left = Math.max(
        margin,
        Math.min(preferredLeft, window.innerWidth - width - margin),
      );
      const spaceAbove = triggerRect.top;
      const top =
        spaceAbove >= height + gap + margin
          ? triggerRect.top - height - gap
          : Math.min(
              triggerRect.bottom + gap,
              window.innerHeight - height - margin,
            );

      setPosition({ left, top: Math.max(margin, top), width });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, text]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <span className="help-tooltip">
      <button
        ref={triggerRef}
        type="button"
        className="help-tooltip-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onPointerDown={(event) => {
          if (event.pointerType === "touch" || event.pointerType === "pen") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        onClick={(event) => {
          if (event.detail === 0) setOpen((value) => !value);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setOpen(false);
        }}
      >
        <CircleHelp size={16} />
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              className="help-tooltip-content is-open"
              role="tooltip"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
              }}
            >
              {text}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
