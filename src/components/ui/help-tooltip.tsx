"use client";
import { CircleHelp } from "lucide-react";
import { useState } from "react";

export function HelpTooltip({
  text,
  label = "Help",
}: {
  text: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="help-tooltip">
      <button
        type="button"
        className="help-tooltip-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp size={16} />
      </button>
      <span
        className={`help-tooltip-content${open ? " is-open" : ""}`}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
