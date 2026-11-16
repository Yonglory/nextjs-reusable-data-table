import type { ReactNode } from "react";

/**
 * Content inside a full-width `<td colSpan>` is as wide as the whole table, so on a
 * narrow screen it can sit off to the side after a horizontal scroll. This box is as
 * wide as the visible scroller and sticks to its left edge, so it always stays in view.
 * The width comes from `--dt-viewport`, which `useScrollerEffects` keeps up to date.
 */
export function ViewportBox({ children }: { children: ReactNode }) {
  return (
    <div className="sticky left-0" style={{ width: "var(--dt-viewport, 100%)" }}>
      {children}
    </div>
  );
}
