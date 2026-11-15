"use client";

import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { ColumnDef, DataTableProps } from "./types";
import { useDataTable } from "./use-data-table";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function pinnedLayout<T>(columns: ColumnDef<T>[]) {
  const offsets = new Map<string, number>();
  let left = 0;
  let lastPinnedId: string | undefined;
  for (const column of columns) {
    if (!column.pinned) continue;
    offsets.set(column.id, left);
    left += column.width ?? 160;
    lastPinnedId = column.id;
  }
  return { offsets, lastPinnedId };
}

function cellValue<T>(column: ColumnDef<T>, row: T): ReactNode {
  if (column.cell) return column.cell(row);
  const value = column.accessor?.(row);
  if (value == null) return "—";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function SortGlyph({ direction }: { direction: "asc" | "desc" | null }) {
  const className = "size-3.5 shrink-0 text-stone-500 transition-opacity duration-150";
  if (direction === "asc") return <ChevronUp className={className} aria-hidden />;
  if (direction === "desc") return <ChevronDown className={className} aria-hidden />;
  return <ChevronsUpDown className={cx(className, "opacity-40")} aria-hidden />;
}

function ExpandedRow({
  open,
  colSpan,
  panelId,
  content,
}: {
  open: boolean;
  colSpan: number;
  panelId: string;
  content: ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const [shown, setShown] = useState(false);
  const [cached, setCached] = useState(content);
  const [seenOpen, setSeenOpen] = useState(open);

  if (content !== null && content !== cached) {
    setCached(content);
  }

  if (open !== seenOpen) {
    setSeenOpen(open);
    if (open) {
      setPresent(true);
      setShown(false);
    } else {
      setShown(false);
    }
  }

  useEffect(() => {
    if (!open) {
      const timeout = window.setTimeout(() => setPresent(false), 220);
      return () => window.clearTimeout(timeout);
    }
    const frame = window.requestAnimationFrame(() => setShown(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!present && !open) return null;

  return (
    <tr id={panelId}>
      <td colSpan={colSpan} className="border-b border-line bg-stone-50 p-0">
        <div
          className={cx(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            shown && open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="border-l-2 border-accent px-4 py-3 sm:px-6">{cached}</div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function DataTable<T, TChild = unknown>({
  columns,
  data,
  getRowId,
  getRowLabel,
  status = "ready",
  errorMessage = "Something went wrong while loading this table.",
  onRetry,
  emptyTitle = "Nothing to show",
  emptyDescription = "Try a different view, or check back when records are available.",
  sort,
  defaultSort,
  onSortChange,
  manualSorting,
  pagination,
  defaultPagination,
  onPaginationChange,
  manualPagination,
  rowCount,
  pageSizeOptions,
  paginate = true,
  expandable,
  ariaLabel,
  skeletonRowCount = 8,
  maxHeight = 640,
  density = "comfortable",
}: DataTableProps<T, TChild>) {
  const table = useDataTable<T, TChild>({
    columns,
    data,
    getRowId,
    status,
    sort,
    defaultSort,
    onSortChange,
    manualSorting,
    pagination,
    defaultPagination,
    onPaginationChange,
    manualPagination,
    rowCount,
    pageSizeOptions,
    paginate,
    expandable,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const onScroll = () => {
      const next = scroller.scrollLeft > 0;
      setScrolled((current) => (current === next ? current : next));
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  const { offsets, lastPinnedId } = pinnedLayout(columns);
  const minWidth = columns.reduce((sum, column) => sum + (column.width ?? 160), 0);
  const cellPadding = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const constrained = typeof maxHeight === "number";
  const rangeStart =
    table.total === 0 ? 0 : table.pagination.pageIndex * table.pagination.pageSize + 1;
  const rangeEnd = Math.min(
    table.total,
    (table.pagination.pageIndex + 1) * table.pagination.pageSize,
  );
  const navigationDisabled = status === "loading" || table.total === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div
        ref={scrollerRef}
        className={constrained ? "overflow-auto" : "overflow-x-auto"}
        style={constrained ? { maxHeight } : undefined}
      >
        <table
          aria-label={ariaLabel}
          aria-busy={status === "loading"}
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth }}
        >
          <thead>
            <tr>
              {columns.map((column) => {
                const pinned = offsets.has(column.id);
                const active =
                  table.sort?.columnId === column.id ? table.sort.direction : null;
                const style: CSSProperties = {
                  width: column.width,
                  minWidth: column.width,
                  left: pinned ? offsets.get(column.id) : undefined,
                };
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      column.sortable
                        ? active === "asc"
                          ? "ascending"
                          : active === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                    style={style}
                    className={cx(
                      "sticky top-0 border-b border-line bg-surface text-left text-xs font-medium tracking-wide text-stone-500 uppercase",
                      cellPadding,
                      pinned && "z-30",
                      !pinned && "z-10",
                      column.align === "right" && "text-right",
                      scrolled &&
                        column.id === lastPinnedId &&
                        "shadow-[6px_0_12px_-8px_rgba(28,25,23,0.55)]",
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => table.toggleSort(column.id)}
                        className={cx(
                          "inline-flex max-w-full items-center gap-1 rounded-md text-left text-stone-500 uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          column.align === "right" && "ml-auto",
                        )}
                      >
                        <span className="truncate">{column.header}</span>
                        <SortGlyph direction={active} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {status === "loading"
              ? Array.from({ length: skeletonRowCount }, (_, index) => (
                  <tr key={`skeleton-${index}`} aria-hidden>
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          left: offsets.has(column.id)
                            ? offsets.get(column.id)
                            : undefined,
                        }}
                        className={cx(
                          "border-b border-line bg-surface",
                          cellPadding,
                          offsets.has(column.id) && "sticky z-20",
                          scrolled &&
                            column.id === lastPinnedId &&
                            "shadow-[6px_0_12px_-8px_rgba(28,25,23,0.55)]",
                        )}
                      >
                        <div
                          className="h-4 animate-pulse rounded bg-stone-200"
                          style={{ width: column.align === "right" ? "40%" : "72%", marginLeft: column.align === "right" ? "auto" : undefined }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {status === "error" ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm font-medium text-foreground">Could not load rows</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">{errorMessage}</p>
                  {onRetry ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#18573c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Retry
                    </button>
                  ) : null}
                </td>
              </tr>
            ) : null}

            {status === "ready" && table.pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                  <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                    {emptyDescription}
                  </p>
                </td>
              </tr>
            ) : null}

            {status === "ready"
              ? table.pageRows.map((row) => {
                  const rowId = getRowId(row);
                  const expanded = table.expandedIds.has(rowId);
                  const panelId = `row-${rowId}-panel`;
                  const label = getRowLabel?.(row) ?? rowId;
                  return (
                    <TableRow
                      key={rowId}
                      row={row}
                      rowId={rowId}
                      label={label}
                      columns={columns}
                      offsets={offsets}
                      lastPinnedId={lastPinnedId}
                      scrolled={scrolled}
                      cellPadding={cellPadding}
                      expanded={expanded}
                      panelId={panelId}
                      expandable={Boolean(expandable)}
                      onToggle={table.toggleRow}
                      expandedContent={
                        expandable && expanded
                          ? expandable.renderSubRows(table.getSubRowContext(row))
                          : null
                      }
                    />
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {paginate ? (
        <nav
          aria-label={`${ariaLabel} pagination`}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
        >
          <p className="text-sm text-stone-500">
            {status === "loading"
              ? "Loading…"
              : table.total === 0
                ? "0 rows"
                : `${rangeStart}–${rangeEnd} of ${table.total}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-stone-500">
              Rows
              <select
                value={table.pagination.pageSize}
                disabled={status === "loading"}
                onChange={(event) => table.setPageSize(Number(event.target.value))}
                className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
              >
                {table.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <PageButton
                label="First page"
                disabled={navigationDisabled || table.pagination.pageIndex === 0}
                onClick={() => table.setPageIndex(0)}
              >
                First
              </PageButton>
              <PageButton
                label="Previous page"
                disabled={navigationDisabled || table.pagination.pageIndex === 0}
                onClick={() => table.setPageIndex(table.pagination.pageIndex - 1)}
              >
                Prev
              </PageButton>
              <span className="px-2 text-sm text-stone-600 tabular-nums">
                {table.pagination.pageIndex + 1} / {table.pageCount}
              </span>
              <PageButton
                label="Next page"
                disabled={
                  navigationDisabled ||
                  table.pagination.pageIndex >= table.pageCount - 1
                }
                onClick={() => table.setPageIndex(table.pagination.pageIndex + 1)}
              >
                Next
              </PageButton>
              <PageButton
                label="Last page"
                disabled={
                  navigationDisabled ||
                  table.pagination.pageIndex >= table.pageCount - 1
                }
                onClick={() => table.setPageIndex(table.pageCount - 1)}
              >
                Last
              </PageButton>
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TableRow<T>({
  row,
  rowId,
  label,
  columns,
  offsets,
  lastPinnedId,
  scrolled,
  cellPadding,
  expanded,
  panelId,
  expandable,
  onToggle,
  expandedContent,
}: {
  row: T;
  rowId: string;
  label: string;
  columns: ColumnDef<T>[];
  offsets: Map<string, number>;
  lastPinnedId?: string;
  scrolled: boolean;
  cellPadding: string;
  expanded: boolean;
  panelId: string;
  expandable: boolean;
  onToggle: (rowId: string) => void;
  expandedContent: ReactNode;
}) {
  return (
    <>
      <tr className="group">
        {columns.map((column, index) => {
          const pinned = offsets.has(column.id);
          return (
            <td
              key={column.id}
              style={{
                width: column.width,
                minWidth: column.width,
                left: pinned ? offsets.get(column.id) : undefined,
              }}
              className={cx(
                "border-b border-line bg-surface text-foreground transition-colors group-hover:bg-stone-50",
                cellPadding,
                pinned && "sticky z-20",
                column.align === "right" && "text-right tabular-nums",
                scrolled &&
                  column.id === lastPinnedId &&
                  "shadow-[6px_0_12px_-8px_rgba(28,25,23,0.55)]",
              )}
            >
              {index === 0 && expandable ? (
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
                    onClick={() => onToggle(rowId)}
                    className="mt-0.5 rounded-md p-0.5 text-stone-500 transition-colors hover:bg-stone-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <ChevronRight
                      className={cx(
                        "size-4 transition-transform duration-200 motion-reduce:transition-none",
                        expanded && "rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div className="min-w-0">{cellValue(column, row)}</div>
                </div>
              ) : (
                cellValue(column, row)
              )}
            </td>
          );
        })}
      </tr>
      {expandable ? (
        <ExpandedRow
          open={expanded}
          colSpan={columns.length}
          panelId={panelId}
          content={expandedContent}
        />
      ) : null}
    </>
  );
}
