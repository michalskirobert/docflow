"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/shared/button";

export function DownloadPdfButton({
  documentId,
  fileName,
  label,
  errorLabel,
}: {
  documentId: string;
  fileName: string;
  label: string;
  errorLabel: string;
}) {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    if (loading) return;
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
      window.alert(errorLabel);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="ghost" loading={loading} onClick={download}>
      {!loading && <Download size={18} />}
      {label}
    </Button>
  );
}
