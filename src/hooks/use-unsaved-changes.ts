"use client";

import { useEffect } from "react";

type ConfirmLeave = () => Promise<boolean>;

export function useUnsavedChanges(active: boolean, confirmLeave: ConfirmLeave) {
  useEffect(() => {
    if (!active) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.href === window.location.href
      )
        return;

      event.preventDefault();
      event.stopPropagation();
      void confirmLeave().then((leave) => {
        if (leave) window.location.assign(url.href);
      });
    };

    const guardState = {
      ...(window.history.state ?? {}),
      docflowUnsavedGuard: true,
    };
    window.history.pushState(guardState, "", window.location.href);

    let handlingPopState = false;
    const popState = () => {
      if (handlingPopState) return;
      handlingPopState = true;
      void confirmLeave().then((leave) => {
        if (leave) {
          window.removeEventListener("popstate", popState);
          window.history.back();
          return;
        }
        window.history.pushState(guardState, "", window.location.href);
        handlingPopState = false;
      });
    };

    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popState);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("popstate", popState);
      document.removeEventListener("click", click, true);
    };
  }, [active, confirmLeave]);
}
