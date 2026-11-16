"use client";

import { useMemo, useRef } from "react";
import { cx } from "./cx";
import { PaginationBar } from "./pagination-bar";
import { getColumnLayout } from "./pinned";
import { TableHeader } from "./table-header";
import { TableRow } from "./table-row";
import { EmptyRow, ErrorRow, SkeletonRows } from "./table-states";
import type { DataTableProps } from "./types";
import { useDataTable } from "./use-data-table";
import { useScrollerEffects } from "./use-scroller-effects";

const PADDING = {
  comfortable: "px-4 py-2.5",
  compact: "px-3 py-1.5",
} as const;

/**
 * Generic, column-driven table. This component only wires the pieces together:
 * state lives in `useDataTable`, and each part of the UI has its own file.
 */
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
  ariaLabel,
  skeletonRowCount = 8,
  maxHeight = 640,
  density = "comfortable",
  paginate = true,
  expandable,
  ...stateProps // sort, pagination and their callbacks: passed straight to the hook
}: DataTableProps<T, TChild>) {
  const table = useDataTable<T, TChild>({
    columns,
    data,
    getRowId,
    status,
    paginate,
    expandable,
    ...stateProps,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  useScrollerEffects(scrollerRef);

  const layout = useMemo(() => getColumnLayout(columns), [columns]);
  const padding = PADDING[density];
  const constrained = typeof maxHeight === "number";
  const sortKey = table.sort ? `${table.sort.columnId}:${table.sort.direction}` : "none";

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {/* Screen readers hear loading start; the visual cue is the skeleton rows. */}
      <p role="status" className="sr-only">
        {status === "loading" ? `Loading ${ariaLabel}` : ""}
      </p>

      <div
        ref={scrollerRef}
        className={cx("dt-scroller", constrained ? "overflow-auto" : "overflow-x-auto")}
        style={constrained ? { maxHeight } : undefined}
      >
        <table
          aria-label={ariaLabel}
          aria-busy={status === "loading"}
          className="w-full table-fixed border-separate border-spacing-0 text-[13px] leading-5"
          style={{ minWidth: layout.tableMinWidth }}
        >
          <TableHeader
            columns={columns}
            layout={layout}
            sort={table.sort}
            padding={padding}
            onToggleSort={table.toggleSort}
          />

          {/* Changing `key` on sort replays the short fade-in on the new order. */}
          <tbody key={sortKey} className="dt-fade-in">
            {status === "loading" ? (
              <SkeletonRows
                columns={columns}
                layout={layout}
                count={skeletonRowCount}
                padding={padding}
              />
            ) : null}

            {status === "error" ? (
              <ErrorRow
                colSpan={columns.length}
                message={errorMessage}
                onRetry={onRetry}
              />
            ) : null}

            {status === "ready" && table.pageRows.length === 0 ? (
              <EmptyRow
                colSpan={columns.length}
                title={emptyTitle}
                description={emptyDescription}
              />
            ) : null}

            {status === "ready"
              ? table.pageRows.map((row) => {
                  const rowId = getRowId(row);
                  const expanded = table.expandedIds.has(rowId);
                  return (
                    <TableRow
                      key={rowId}
                      row={row}
                      rowId={rowId}
                      label={getRowLabel?.(row) ?? rowId}
                      columns={columns}
                      layout={layout}
                      padding={padding}
                      expandable={Boolean(expandable)}
                      expanded={expanded}
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
        <PaginationBar
          ariaLabel={ariaLabel}
          loading={status === "loading"}
          total={table.total}
          pageIndex={table.pagination.pageIndex}
          pageSize={table.pagination.pageSize}
          pageCount={table.pageCount}
          pageSizeOptions={table.pageSizeOptions}
          onPageIndexChange={table.setPageIndex}
          onPageSizeChange={table.setPageSize}
        />
      ) : null}
    </div>
  );
}
