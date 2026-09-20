import { LoaderCircle } from "lucide-react";

export function PendingOverlay({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  if (!active) return null;
  return (
    <div className="pending-overlay" role="status" aria-live="polite">
      <div className="pending-overlay-content">
        <LoaderCircle className="spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}
