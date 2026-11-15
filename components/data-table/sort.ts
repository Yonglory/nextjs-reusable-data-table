import type { ColumnDef, SortState } from "./types";

export function compareValues(
  left: string | number | Date | null | undefined,
  right: string | number | Date | null | undefined,
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function resolveSort<T>(
  columns: ColumnDef<T>[],
  sort: SortState,
): SortState {
  if (!sort) return null;
  const column = columns.find((item) => item.id === sort.columnId);
  if (!column?.sortable || !column.accessor) return null;
  if (sort.direction !== "asc" && sort.direction !== "desc") return null;
  return sort;
}

export function nextSort(current: SortState, columnId: string): SortState {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

export function sortRows<T>(
  rows: readonly T[],
  columns: ColumnDef<T>[],
  sort: SortState,
): T[] {
  const resolved = resolveSort(columns, sort);
  if (!resolved) return [...rows];

  const column = columns.find((item) => item.id === resolved.columnId);
  const accessor = column?.accessor;
  if (!accessor) return [...rows];

  const direction = resolved.direction === "asc" ? 1 : -1;
  return rows.toSorted(
    (left, right) => compareValues(accessor(left), accessor(right)) * direction,
  );
}
