import type { CSSProperties } from "react";
import { cx } from "./cx";
import type { ColumnDef } from "./types";

export const DEFAULT_COLUMN_WIDTH = 160;

/**
 * A pinned column may never take more than this share of the viewport, so a wide
 * pinned column on a phone still leaves room to see the other columns.
 */
const PINNED_MAX_VIEWPORT_SHARE = "45vw";

export type ColumnLayout = {
  /** CSS `left` value for each pinned column, keyed by column id. */
  offsets: Map<string, string>;
  /** The right-most pinned column. It carries the divider and scroll shadow. */
  lastPinnedId?: string;
  /** CSS `min-width` for the table so no column is squeezed below its width. */
  tableMinWidth: string;
};

function pinnedWidth(width: number) {
  return `min(${width}px, ${PINNED_MAX_VIEWPORT_SHARE})`;
}

/**
 * Works out where each pinned column sticks. Pinned columns are expected to come
 * first in `columns`; each one stacks to the right of the previous one.
 * Offsets are CSS strings (not numbers) because widths can be `min(...)` expressions.
 */
export function getColumnLayout<T>(columns: ColumnDef<T>[]): ColumnLayout {
  const offsets = new Map<string, string>();
  const pinnedTerms: string[] = [];
  let fixedPx = 0;
  let lastPinnedId: string | undefined;

  for (const column of columns) {
    const width = column.width ?? DEFAULT_COLUMN_WIDTH;
    if (column.pinned) {
      offsets.set(
        column.id,
        pinnedTerms.length ? `calc(${pinnedTerms.join(" + ")})` : "0px",
      );
      pinnedTerms.push(pinnedWidth(width));
      lastPinnedId = column.id;
    } else {
      fixedPx += width;
    }
  }

  const terms = fixedPx > 0 ? [...pinnedTerms, `${fixedPx}px`] : pinnedTerms;
  const tableMinWidth =
    terms.length > 1 ? `calc(${terms.join(" + ")})` : (terms[0] ?? "0px");

  return { offsets, lastPinnedId, tableMinWidth };
}

type CellLayer = "head" | "body";

/**
 * The one place that decides a cell's width, sticky position and layering.
 * Header, body and skeleton cells all call this, so they cannot drift apart.
 *
 * - The last column has no fixed width. It absorbs spare space, which keeps the
 *   pinned offsets exact when the container is wider than the table.
 * - Layers: pinned header (30) > pinned body (20) > plain header (10) > body cells.
 */
export function getCellProps<T>(
  column: ColumnDef<T>,
  layout: ColumnLayout,
  layer: CellLayer,
  isLastColumn: boolean,
): { style: CSSProperties; className: string } {
  const left = layout.offsets.get(column.id);
  const pinned = left !== undefined;
  const width = column.width ?? DEFAULT_COLUMN_WIDTH;

  const style: CSSProperties = pinned
    ? { width: pinnedWidth(width), left }
    : { width: isLastColumn ? undefined : width };

  const className = cx(
    pinned && "sticky",
    pinned && (layer === "head" ? "z-30" : "z-20"),
    !pinned && layer === "head" && "z-10",
    column.id === layout.lastPinnedId && "dt-pin-edge",
    column.align === "right" && "text-right",
  );

  return { style, className };
}
