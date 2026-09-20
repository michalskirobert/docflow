"use client";

import { X } from "lucide-react";

type Props = {
  label: string;
};

export default function ClosePreviewButton({ label }: Props) {
  return (
    <button
      type="button"
      className="btn secondary"
      onClick={() => window.close()}
    >
      <X size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
