"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function EditorBottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("common");
  const titleId = useId();
  const [present, setPresent] = useState(open);
  const visible = open || present;
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const timeout = window.setTimeout(
      () => setPresent(false),
      reducedMotion ? 0 : 280,
    );
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const first =
        panel.current?.querySelector<HTMLElement>(
          "input:not([type=hidden]):not(:disabled)",
        ) ?? panel.current?.querySelector<HTMLElement>("button:not(:disabled)");
      (first ?? panel.current)?.focus({ preventScroll: true });
    });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ) ?? [],
      ).filter(
        (element) =>
          element.getClientRects().length &&
          element.getAttribute("aria-hidden") !== "true",
      );
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", keydown, true);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [visible]);

  if (!visible) return null;
  return createPortal(
    <div
      className="editor-bottom-sheet-backdrop"
      data-state={open ? "open" : "closing"}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="editor-bottom-sheet"
        onAnimationEnd={(event) => {
          if (
            !open &&
            event.target === event.currentTarget &&
            event.animationName === "editor-sheet-exit"
          ) {
            setPresent(false);
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          className="editor-bottom-sheet-handle"
          aria-label={t("close")}
          onClick={onClose}
          onPointerDown={(event) => {
            event.currentTarget.dataset.startY = String(event.clientY);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (event.clientY - Number(event.currentTarget.dataset.startY) > 40)
              onClose();
          }}
        >
          <span aria-hidden="true" />
        </button>
        <header>
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label={t("close")}>
            <X size={22} />
          </button>
        </header>
        <div className="editor-bottom-sheet-content">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
