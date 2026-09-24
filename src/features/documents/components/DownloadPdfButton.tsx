"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";

export function DownloadPdfButton({
  documentId,
  fileName,
  label,
  errorLabel,
  disabled = false,
}: {
  documentId: string;
  fileName: string;
  label: string;
  errorLabel: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const { notify } = useFeedback();

  const download = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/pdf`);
      if (!response.ok) throw new Error("PDF download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName.replace(/[\\/:*?\"<>|]+/g, "-")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify(errorLabel, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" disabled={disabled || loading} onClick={download}>
      {loading ? (
        <LoaderCircle className="spinner" size={18} />
      ) : (
        <Download size={18} />
      )}
      {label}
    </button>
  );
}
