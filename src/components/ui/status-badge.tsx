type StatusTone = "success" | "warning" | "danger" | "neutral";

const toneByStatus: Record<string, StatusTone> = {
  ACTIVE: "success",
  COMPLETED: "success",
  PAID: "success",
  SUCCESS: "success",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILED: "danger",
  ERROR: "danger",
  EXPIRED: "danger",
  CANCELED: "danger",
  CANCELLED: "danger",
  INACTIVE: "neutral",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  const normalized = status.toUpperCase();
  const tone = toneByStatus[normalized] ?? "neutral";
  return <span className={`status-badge ${tone}`}>{label ?? normalized}</span>;
}
