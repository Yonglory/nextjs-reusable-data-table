import type { ColumnDef, SortState, SortValue } from "./types";

// One shared collator. `localeCompare` with options builds a new one on every call,
// which is slow when sorting thousands of rows.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function compareValues(left: SortValue, right: SortValue): number {
  // Empty values always sort last, in both directions of the base comparison.
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return collator.compare(String(left), String(right));
}

/** Returns the sort only if it points at a sortable column and has a valid direction. */
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

/** Header click cycle: none -> asc -> desc -> none. */
export function nextSort(current: SortState, columnId: string): SortState {
  if (!current || current.columnId !== columnId) {
    return { columnId, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { columnId, direction: "desc" };
  }
  return null;
}

/**
 * Sorts a copy of `rows`. The accessor runs once per row (not once per comparison),
 * then a sorted list of row positions is used to build the result. For 10,000 rows
 * that is 10,000 accessor calls instead of roughly 130,000.
 */
export function sortRows<T>(
  rows: readonly T[],
  columns: ColumnDef<T>[],
  sort: SortState,
): T[] {
  const resolved = resolveSort(columns, sort);
  const accessor = columns.find((item) => item.id === resolved?.columnId)?.accessor;
  if (!resolved || !accessor) return [...rows];

  const keys = rows.map(accessor);
  const direction = resolved.direction === "asc" ? 1 : -1;
  const order = Array.from(rows.keys());
  // Array.prototype.sort is stable, so equal keys keep their original order.
  order.sort((a, b) => compareValues(keys[a], keys[b]) * direction);
  return order.map((index) => rows[index]);
}
