"use client";

import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, Printer, X } from "lucide-react";

type Props = {
  title: string;
  previewLabel: string;
  closeLabel: string;
  printLabel: string;
  downloadLabel: string;
  pdfUrl: string | null;
  loading?: boolean;
  error?: boolean;
  downloading?: boolean;
  onClose: () => void;
  onDownload: () => void;
};

export function DocumentPdfPreviewModal({
  title,
  previewLabel,
  closeLabel,
  printLabel,
  downloadLabel,
  pdfUrl,
  loading = false,
  error = false,
  downloading = false,
  onClose,
  onDownload,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setResolvedPdfUrl(null);
      return;
    }
    if (!pdfUrl.startsWith("data:application/pdf")) {
      setResolvedPdfUrl(pdfUrl);
      return;
    }

    const [meta, encoded = ""] = pdfUrl.split(",", 2);
    const bytes = meta.includes(";base64")
      ? Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(encoded));
    const objectUrl = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" }),
    );
    setResolvedPdfUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [pdfUrl]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !downloading) onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [downloading, onClose]);

  const disabled = downloading || loading || !resolvedPdfUrl || error;

  return (
    <div className="document-preview-backdrop" role="presentation">
      <section
        className="document-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-preview-title"
      >
        <header className="document-preview-header">
          <div>
            <span>{previewLabel}</span>
            <h2 id="document-preview-title">{title}</h2>
          </div>
          <button
            className="btn secondary compact"
            type="button"
            aria-label={closeLabel}
            disabled={downloading}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="document-preview-frame-wrap">
          {loading && (
            <div
              className="pdf-generation-loader"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="spin" size={34} />
              <strong>Generating PDF…</strong>
              <span>This can take a moment for documents with images.</span>
            </div>
          )}
          {error && (
            <div className="pdf-generation-loader" role="alert">
              <strong>Could not generate PDF preview.</strong>
            </div>
          )}
          {resolvedPdfUrl && !error && (
            <iframe
              ref={frameRef}
              className="document-preview-frame"
              src={`${resolvedPdfUrl}#view=FitH`}
              title={`${previewLabel}: ${title}`}
            />
          )}
        </div>

        <footer className="document-preview-actions">
          <button
            className="btn secondary"
            type="button"
            disabled={disabled}
            onClick={() => frameRef.current?.contentWindow?.print()}
          >
            <Printer size={17} />
            {printLabel}
          </button>
          <button
            className="btn"
            type="button"
            disabled={disabled}
            onClick={onDownload}
          >
            {downloading ? (
              <LoaderCircle className="spinner" size={17} />
            ) : (
              <Download size={17} />
            )}
            {downloadLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}
