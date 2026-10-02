"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export function QueryErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  retrying = false,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="query-error-state" role="alert">
      <AlertTriangle aria-hidden="true" />
      <div className="query-error-copy">
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      <button
        type="button"
        className="btn secondary"
        onClick={onRetry}
        disabled={retrying}
      >
        <RotateCcw aria-hidden="true" />
        {retryLabel}
      </button>
    </div>
  );
}
