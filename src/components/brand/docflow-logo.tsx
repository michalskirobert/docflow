import type { CSSProperties } from "react";

type DocFlowLogoProps = {
  compact?: boolean;
  className?: string;
  showByline?: boolean;
};

export function DocFlowMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 7h25l12 12v36a4 4 0 0 1-4 4H16a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5Z"
        fill="var(--docflow-paper, transparent)"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M41 7v12h12L41 7Z"
        fill="#fbbf24"
        stroke="#fbbf24"
        strokeLinejoin="round"
      />
      <path
        d="M22 30h20M22 39h20M22 48h13"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DocFlowLogo({
  compact = false,
  className = "",
  showByline = false,
}: DocFlowLogoProps) {
  const style = { "--docflow-paper": "transparent" } as CSSProperties;
  return (
    <div
      className={`docflow-logo ${compact ? "is-compact" : ""} ${className}`.trim()}
    >
      <DocFlowMark className="docflow-logo-mark" />
      {!compact && (
        <div className="docflow-logo-copy">
          <div className="docflow-logo-wordmark" style={style}>
            <span>Doc</span>
            <strong>Flow</strong>
          </div>
          {showByline && (
            <span className="docflow-logo-byline">by NurByte</span>
          )}
        </div>
      )}
    </div>
  );
}
