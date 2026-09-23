"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationFeedback() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setPending(false);
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (
        destination.origin !== current.origin ||
        (destination.pathname === current.pathname &&
          destination.search === current.search)
      ) {
        return;
      }

      setPending(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;

    // Never leave the UI covered if a navigation is cancelled or fails.
    const timeout = window.setTimeout(() => setPending(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  if (!pending) return null;

  return (
    <div className="route-transition" role="status" aria-live="polite">
      <div className="route-transition-progress" />
      <div className="route-transition-skeleton" aria-hidden="true">
        <span className="skeleton-line route-title" />
        <span className="skeleton-line route-subtitle" />
        <div className="route-transition-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <span className="skeleton-card route-card" key={index} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
