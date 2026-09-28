import Image from "next/image";

type DocFlowLogoProps = {
  compact?: boolean;
  className?: string;
  showByline?: boolean;
};

export function DocFlowMark({ className = "" }: { className?: string }) {
  return (
    <Image
      aria-hidden="true"
      className={className}
      src="/brand/docflow-icon-256.png"
      alt=""
      width={256}
      height={256}
      priority
    />
  );
}

export function DocFlowLogo({
  compact = false,
  className = "",
  showByline = false,
}: DocFlowLogoProps) {
  return (
    <div
      className={`docflow-logo ${compact ? "is-compact" : ""} ${className}`.trim()}
    >
      <DocFlowMark className="docflow-logo-mark" />
      <div className="docflow-logo-copy">
        <div className="docflow-logo-wordmark">
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
