"use client";

/**
 * All table state lives here, so the components can stay purely presentational.
 *
 * Controlled vs uncontrolled (same idea as a React <input>):
 * - Pass `sort` / `pagination` and the parent owns the value. The table only
 *   reports changes through `onSortChange` / `onPaginationChange`.
 * - Leave them out and the table keeps its own state, starting from
 *   `defaultSort` / `defaultPagination`.
 *
 * Client vs server (independent of the above):
 * - `manualSorting`: the table does not reorder `data`; the parent already did.
 * - `manualPagination`: `data` is one page and `rowCount` is the full total.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clampPageIndex, getPageCount } from "./paginate";
import { nextSort, resolveSort, sortRows } from "./sort";
import type {
  DataTableProps,
  PaginationState,
  SortState,
  SubRowRenderContext,
  SubRowStatus,
} from "./types";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

type CacheEntry<TChild> =
  | { status: "ready"; rows: TChild[] }
  | { status: "error"; error: string };

type UseDataTableArgs<T, TChild> = Pick<
  DataTableProps<T, TChild>,
  | "columns"
  | "data"
  | "getRowId"
  | "status"
  | "sort"
  | "defaultSort"
  | "onSortChange"
  | "manualSorting"
  | "pagination"
  | "defaultPagination"
  | "onPaginationChange"
  | "manualPagination"
  | "rowCount"
  | "pageSizeOptions"
  | "paginate"
  | "expandable"
>;

export function useDataTable<T, TChild>({
  columns,
  data,
  getRowId,
  status = "ready",
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  manualSorting = false,
  pagination: paginationProp,
  defaultPagination,
  onPaginationChange,
  manualPagination = false,
  rowCount,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  paginate = true,
  expandable,
}: UseDataTableArgs<T, TChild>) {
  const expandMode = expandable?.mode;
  const loadSubRows = expandable?.loadSubRows;
  const getSubRows = expandable?.getSubRows;

  // ---- Sort -----------------------------------------------------------------
  const isSortControlled = sortProp !== undefined;
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState>(defaultSort);
  // An unknown column, a non-sortable column or a bad direction resolves to "no sort".
  const sort = resolveSort(
    columns,
    isSortControlled ? (sortProp ?? null) : uncontrolledSort,
  );

  // ---- Pagination -----------------------------------------------------------
  const isPaginationControlled = paginationProp !== undefined;
  const [uncontrolledPagination, setUncontrolledPagination] =
    useState<PaginationState>(
      defaultPagination ?? { pageIndex: 0, pageSize: pageSizeOptions[0] ?? 10 },
    );
  const rawPagination = paginationProp ?? uncontrolledPagination;
  const pageSize =
    rawPagination.pageSize > 0
      ? rawPagination.pageSize
      : (pageSizeOptions[0] ?? 10);

  // ---- Derived rows ---------------------------------------------------------
  const sortedRows = useMemo(
    () => (manualSorting ? data : sortRows(data, columns, sort)),
    [columns, data, manualSorting, sort],
  );

  const total = manualPagination ? (rowCount ?? 0) : sortedRows.length;

  // While loading, `total` is not trustworthy yet, so the page is not clamped.
  const canClamp = paginate && status === "ready";
  const pageIndex = canClamp
    ? clampPageIndex(rawPagination.pageIndex, pageSize, total)
    : Math.max(
        0,
        Number.isFinite(rawPagination.pageIndex)
          ? Math.trunc(rawPagination.pageIndex)
          : 0,
      );
  const pageCount = paginate ? getPageCount(total, pageSize) : 1;

  const pageRows = useMemo(() => {
    if (!paginate || manualPagination) return sortedRows;
    const start = pageIndex * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [manualPagination, pageIndex, pageSize, paginate, sortedRows]);

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex, pageSize }),
    [pageIndex, pageSize],
  );

  const commitPagination = useCallback(
    (next: PaginationState) => {
      if (!isPaginationControlled) setUncontrolledPagination(next);
      onPaginationChange?.(next);
    },
    [isPaginationControlled, onPaginationChange],
  );

  // A controlled page that is out of range is shown clamped. Tell the parent too,
  // otherwise its state would keep pointing at a page that does not exist.
  const needsPageSync =
    canClamp && isPaginationControlled && rawPagination.pageIndex !== pageIndex;
  useEffect(() => {
    if (needsPageSync) onPaginationChange?.({ pageIndex, pageSize });
  }, [needsPageSync, onPaginationChange, pageIndex, pageSize]);

  // ---- Sort and page actions ------------------------------------------------
  const toggleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((item) => item.id === columnId);
      if (!column?.sortable || !column.accessor) return;
      const next = resolveSort(columns, nextSort(sort, columnId));
      if (!isSortControlled) setUncontrolledSort(next);
      onSortChange?.(next);
      // A new order makes the old offset meaningless. In manual mode the parent
      // refetches, so it resets the page itself.
      if (paginate && !manualPagination) {
        commitPagination({ pageIndex: 0, pageSize });
      }
    },
    [
      columns,
      commitPagination,
      isSortControlled,
      manualPagination,
      onSortChange,
      pageSize,
      paginate,
      sort,
    ],
  );

  const setPageIndex = useCallback(
    (nextIndex: number) => {
      commitPagination({
        pageIndex: clampPageIndex(nextIndex, pageSize, total),
        pageSize,
      });
    },
    [commitPagination, pageSize, total],
  );

  const setPageSize = useCallback(
    (nextSize: number) => {
      const size = nextSize > 0 ? nextSize : (pageSizeOptions[0] ?? 10);
      commitPagination({
        pageIndex: clampPageIndex(pageIndex, size, total),
        pageSize: size,
      });
    },
    [commitPagination, pageIndex, pageSizeOptions, total],
  );

  // ---- Expansion ------------------------------------------------------------
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [cache, setCache] = useState<Map<string, CacheEntry<TChild>>>(
    () => new Map(),
  );
  // Latest request number per row. A response is ignored unless it is the latest,
  // so a slow old request can never overwrite a newer retry.
  const requestsRef = useRef(new Map<string, number>());

  // Stable identity, so memoised rows do not re-render when another row toggles.
  const toggleRow = useCallback((rowId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const fetchSubRows = useCallback(
    (row: T) => {
      if (!loadSubRows) return;
      const id = getRowId(row);
      const token = (requestsRef.current.get(id) ?? 0) + 1;
      requestsRef.current.set(id, token);
      const isLatest = () => requestsRef.current.get(id) === token;

      const store = (entry: CacheEntry<TChild>) =>
        setCache((previous) => new Map(previous).set(id, entry));

      loadSubRows(row)
        .then((rows) => {
          if (isLatest()) store({ status: "ready", rows });
        })
        .catch((error: unknown) => {
          if (!isLatest()) return;
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Could not load rows.";
          store({ status: "error", error: message });
        });
    },
    [getRowId, loadSubRows],
  );

  // On-demand mode: start a fetch for every expanded row that has none yet.
  // "No cache entry" is what the UI shows as loading, so no loading state is stored.
  useEffect(() => {
    if (expandMode !== "onDemand") return;
    for (const row of pageRows) {
      const id = getRowId(row);
      if (!expandedIds.has(id) || cache.has(id)) continue;
      if (requestsRef.current.has(id)) continue; // already in flight
      fetchSubRows(row);
    }
  }, [cache, expandMode, expandedIds, fetchSubRows, getRowId, pageRows]);

  const getSubRowContext = (row: T): SubRowRenderContext<T, TChild> => {
    const id = getRowId(row);
    const retry = () => {
      setCache((previous) => {
        const next = new Map(previous);
        next.delete(id);
        return next;
      });
      fetchSubRows(row);
    };

    if (expandMode !== "onDemand") {
      const rows = getSubRows?.(row) ?? [];
      const subStatus: SubRowStatus = rows.length === 0 ? "empty" : "ready";
      return { parent: row, rows, status: subStatus, retry };
    }

    const entry = cache.get(id);
    if (!entry) return { parent: row, rows: [], status: "loading", retry };
    if (entry.status === "error") {
      return { parent: row, rows: [], status: "error", error: entry.error, retry };
    }
    return {
      parent: row,
      rows: entry.rows,
      status: entry.rows.length === 0 ? "empty" : "ready",
      retry,
    };
  };

  return {
    pageRows,
    sort,
    toggleSort,
    pagination,
    pageCount,
    total,
    setPageIndex,
    setPageSize,
    pageSizeOptions,
    expandedIds,
    toggleRow,
    getSubRowContext,
  };
}
