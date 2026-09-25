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
      <defs>
        <linearGradient
          id="docflow-ribbon"
          x1="8"
          y1="20"
          x2="56"
          y2="52"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fde047" />
          <stop offset=".48" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>

        <linearGradient
          id="docflow-ribbon-dark"
          x1="18"
          y1="35"
          x2="48"
          y2="59"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#b45309" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <path
        d="M20 6h22l12 12v31c0 4-3 7-7 7H20c-4 0-7-3-7-7V13c0-4 3-7 7-7Z"
        fill="#fff"
        stroke="#111827"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M42 6v12h12"
        fill="#fbbf24"
        stroke="#fbbf24"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      <path
        d="M23 24h18M23 31h23"
        stroke="#111827"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M9 30c8-8 17-8 24-4 8 5 13 14 23 15-4 9-11 14-20 14-11 0-19-7-27-12 7 1 14 1 21-1-7-3-14-7-21-12Z"
        fill="url(#docflow-ribbon)"
      />

      <path
        d="M30 42c7 3 13 8 19 13H31c-8 0-14-4-18-10 6 1 12 0 17-3Z"
        fill="url(#docflow-ribbon-dark)"
        opacity=".9"
      />
    </svg>
  );
}

export function DocFlowLogo({
  compact = false,
  className = "",
  showByline = false,
}: DocFlowLogoProps) {
  const style = {
    "--docflow-paper": "transparent",
  } as CSSProperties;

  return (
    <div
      className={`docflow-logo ${compact ? "is-compact" : ""} ${className}`.trim()}
    >
      <DocFlowMark className="docflow-logo-mark" />

      <div className="docflow-logo-copy">
        <div className="docflow-logo-wordmark" style={style}>
          <span>Doc</span>
          <strong>Flow</strong>
        </div>

        {!compact && showByline && (
          <span className="docflow-logo-byline">by NurByte</span>
        )}
      </div>
    </div>
  );
}
