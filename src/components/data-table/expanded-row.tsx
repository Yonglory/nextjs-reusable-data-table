"use client";

import { useState, type ReactNode } from "react";
import { cx } from "./cx";
import { useDelayedUnmount } from "./use-delayed-unmount";
import { ViewportBox } from "./viewport-box";

const EXIT_MS = 200;

type ExpandedRowProps = {
  open: boolean;
  colSpan: number;
  panelId: string;
  /** `null` while the row is collapsed. */
  content: ReactNode;
};

/**
 * The panel under a parent row. It spans every column and animates its height by
 * transitioning a CSS grid row between 0fr and 1fr (no JS height measuring).
 */
export function ExpandedRow({ open, colSpan, panelId, content }: ExpandedRowProps) {
  const { mounted, visible } = useDelayedUnmount(open, EXIT_MS);

  // While collapsing, the parent already passes `null`. Keep the last real content
  // so the panel can shrink smoothly instead of going blank first.
  const [lastContent, setLastContent] = useState(content);
  if (content !== null && content !== lastContent) setLastContent(content);

  if (!mounted) return null;

  return (
    <tr id={panelId}>
      <td colSpan={colSpan} className="border-b border-line bg-zinc-50/70 p-0">
        <ViewportBox>
          <div
            className={cx(
              "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
              visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="border-l-2 border-accent px-4 py-4 sm:px-6">
                {lastContent}
              </div>
            </div>
          </div>
        </ViewportBox>
      </td>
    </tr>
  );
}
