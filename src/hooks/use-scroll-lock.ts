"use client";

import { useEffect } from "react";

/**
 * Locks the page behind full-screen overlays while leaving the overlay's own
 * scroll container untouched. Restores every inline value on cleanup so the
 * hook is safe when the overlay is closed/unmounted.
 */
export function useScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";

    // Avoid a horizontal layout jump when the browser removes the page scrollbar.
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(
        window.getComputedStyle(body).paddingRight || "0",
      );
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    return () => {
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.paddingRight = previousBodyPaddingRight;
    };
  }, [locked]);
}
