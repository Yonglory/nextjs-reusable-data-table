import type { PaginationState } from "./types";

export function getPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0 || total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function clampPageIndex(
  pageIndex: number,
  pageSize: number,
  total: number,
): number {
  const pageCount = getPageCount(total, pageSize);
  if (!Number.isFinite(pageIndex)) return 0;
  const index = Math.trunc(pageIndex);
  if (index < 0) return 0;
  if (index > pageCount - 1) return pageCount - 1;
  return index;
}

export function paginateRows<T>(
  rows: readonly T[],
  pagination: PaginationState,
): { rows: T[]; pageIndex: number; pageCount: number } {
  const pageSize = pagination.pageSize > 0 ? pagination.pageSize : 10;
  const pageCount = getPageCount(rows.length, pageSize);
  const pageIndex = clampPageIndex(pagination.pageIndex, pageSize, rows.length);
  const start = pageIndex * pageSize;
  return {
    rows: rows.slice(start, start + pageSize),
    pageIndex,
    pageCount,
  };
}
