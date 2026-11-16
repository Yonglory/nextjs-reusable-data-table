"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

type CacheEntry<TChild> = {
  status: "loading" | "error" | "ready";
  rows: TChild[];
  error?: string;
};

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
  const isSortControlled = sortProp !== undefined;
  const isPaginationControlled = paginationProp !== undefined;
  const [uncontrolledSort, setUncontrolledSort] = useState<SortState>(defaultSort);
  const [uncontrolledPagination, setUncontrolledPagination] =
    useState<PaginationState>(
      defaultPagination ?? {
        pageIndex: 0,
        pageSize: pageSizeOptions[0] ?? 10,
      },
    );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [cache, setCache] = useState<Map<string, CacheEntry<TChild>>>(
    () => new Map(),
  );
  const requestsRef = useRef(new Map<string, number>());

  const sort = resolveSort(
    columns,
    isSortControlled ? (sortProp ?? null) : uncontrolledSort,
  );
  const rawPagination = isPaginationControlled
    ? (paginationProp ?? uncontrolledPagination)
    : uncontrolledPagination;
  const pageSize =
    rawPagination.pageSize > 0
      ? rawPagination.pageSize
      : (pageSizeOptions[0] ?? 10);

  const sortedRows = useMemo(
    () => (manualSorting ? [...data] : sortRows(data, columns, sort)),
    [columns, data, manualSorting, sort],
  );

  const total = manualPagination ? (rowCount ?? 0) : sortedRows.length;
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

  const rowById = useMemo(() => {
    const map = new Map<string, T>();
    for (const row of data) {
      map.set(getRowId(row), row);
    }
    return map;
  }, [data, getRowId]);

  const commitPagination = useCallback(
    (next: PaginationState) => {
      if (!isPaginationControlled) setUncontrolledPagination(next);
      onPaginationChange?.(next);
    },
    [isPaginationControlled, onPaginationChange],
  );

  const toggleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((item) => item.id === columnId);
      if (!column?.sortable || !column.accessor) return;
      const next = resolveSort(columns, nextSort(sort, columnId));
      if (!isSortControlled) setUncontrolledSort(next);
      onSortChange?.(next);
      if (paginate && !manualPagination) {
        commitPagination({ ...pagination, pageIndex: 0 });
      }
    },
    [
      columns,
      commitPagination,
      isSortControlled,
      manualPagination,
      onSortChange,
      paginate,
      pagination,
      sort,
    ],
  );

  const setPageIndex = useCallback(
    (nextIndex: number) => {
      commitPagination({
        pageIndex: clampPageIndex(nextIndex, pagination.pageSize, total),
        pageSize: pagination.pageSize,
      });
    },
    [commitPagination, pagination.pageSize, total],
  );

  const setPageSize = useCallback(
    (nextSize: number) => {
      const size = nextSize > 0 ? nextSize : (pageSizeOptions[0] ?? 10);
      commitPagination({
        pageIndex: clampPageIndex(pagination.pageIndex, size, total),
        pageSize: size,
      });
    },
    [commitPagination, pageSizeOptions, pagination.pageIndex, total],
  );

  const loadSubRows = useCallback(
    (row: T) => {
      const load = expandable?.loadSubRows;
      if (!load) return;
      const id = getRowId(row);
      const token = (requestsRef.current.get(id) ?? 0) + 1;
      requestsRef.current.set(id, token);
      setCache((prev) => {
        const next = new Map(prev);
        next.set(id, { status: "loading", rows: [] });
        return next;
      });

      load(row)
        .then((rows) => {
          if (requestsRef.current.get(id) !== token) return;
          setCache((prev) => {
            const next = new Map(prev);
            next.set(id, { status: "ready", rows });
            return next;
          });
        })
        .catch((error: unknown) => {
          if (requestsRef.current.get(id) !== token) return;
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Could not load rows.";
          setCache((prev) => {
            const next = new Map(prev);
            next.set(id, { status: "error", rows: [], error: message });
            return next;
          });
        });
    },
    [expandable?.loadSubRows, getRowId],
  );

  const toggleRow = useCallback(
    (rowId: string) => {
      const willOpen = !expandedIds.has(rowId);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) next.delete(rowId);
        else next.add(rowId);
        return next;
      });
      if (!willOpen || expandable?.mode !== "onDemand") return;
      if (cache.has(rowId)) return;
      const row = rowById.get(rowId);
      if (row) loadSubRows(row);
    },
    [cache, expandable?.mode, expandedIds, loadSubRows, rowById],
  );

  const retrySubRows = useCallback(
    (row: T) => {
      loadSubRows(row);
    },
    [loadSubRows],
  );

  const getSubRowContext = useCallback(
    (row: T): SubRowRenderContext<T, TChild> => {
      const retry = () => retrySubRows(row);
      if (expandable?.mode !== "onDemand") {
        const rows = expandable?.getSubRows?.(row) ?? [];
        const subStatus: SubRowStatus = rows.length === 0 ? "empty" : "ready";
        return { parent: row, rows, status: subStatus, retry };
      }

      const entry = cache.get(getRowId(row));
      if (!entry || entry.status === "loading") {
        return { parent: row, rows: [], status: "loading", retry };
      }
      if (entry.status === "error") {
        return {
          parent: row,
          rows: [],
          status: "error",
          error: entry.error,
          retry,
        };
      }
      return {
        parent: row,
        rows: entry.rows,
        status: entry.rows.length === 0 ? "empty" : "ready",
        retry,
      };
    },
    [cache, expandable, getRowId, retrySubRows],
  );

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
