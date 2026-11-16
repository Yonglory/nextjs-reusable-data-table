"use client";

import { useEffect, type RefObject } from "react";

/**
 * Keeps two pieces of scroller state in the DOM instead of in React state:
 *
 * - `data-scrolled` is present while the table is scrolled sideways. CSS uses it
 *   to show the shadow beside the pinned column.
 * - `--dt-viewport` is the visible width of the scroller. Content that spans the
 *   whole table (expanded rows, empty and error states) uses it to stay in view.
 *
 * Writing to the DOM directly means scrolling or resizing never re-renders rows.
 */
export function useScrollerEffects(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const scroller = ref.current;
    if (!scroller) return;

    const syncScrolled = () => {
      scroller.toggleAttribute("data-scrolled", scroller.scrollLeft > 0);
    };
    const syncWidth = () => {
      scroller.style.setProperty("--dt-viewport", `${scroller.clientWidth}px`);
    };

    syncScrolled();
    syncWidth();
    scroller.addEventListener("scroll", syncScrolled, { passive: true });
    const observer = new ResizeObserver(syncWidth);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", syncScrolled);
      observer.disconnect();
    };
  }, [ref]);
}
