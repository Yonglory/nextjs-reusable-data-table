"use client";

import { useEffect, useState } from "react";

/**
 * Drives an enter/exit transition for something that is mounted only while open.
 *
 * - `mounted`: render the element at all.
 * - `visible`: apply the "open" styles. CSS transitions between the two states.
 *
 * Open:  mount first (closed styles), then flip `visible` on the next frame so the
 *        browser has a starting point to animate from.
 * Close: flip `visible` off immediately, then unmount once the transition is done.
 *
 * If it is already open on first render (for example after a re-sort remounts the
 * row), it starts fully open and skips the animation.
 */
export function useDelayedUnmount(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(open);

  // Adjusting state while rendering is React's recommended way to react to a prop change.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      if (entered) return;
      const frame = window.requestAnimationFrame(() => setEntered(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const timeout = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitMs);
    return () => window.clearTimeout(timeout);
  }, [open, entered, exitMs]);

  return { mounted: mounted || open, visible: open && entered };
}
