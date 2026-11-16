import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cx } from "./cx";
import { getCellProps, type ColumnLayout } from "./pinned";
import type { ColumnDef, SortState } from "./types";

type TableHeaderProps<T> = {
  columns: ColumnDef<T>[];
  layout: ColumnLayout;
  sort: SortState;
  padding: string;
  onToggleSort: (columnId: string) => void;
};

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
} as const;

function SortGlyph({ direction }: { direction: "asc" | "desc" | null }) {
  const className = "size-3.5 shrink-0";
  if (direction === "asc") return <ChevronUp className={className} aria-hidden />;
  if (direction === "desc") return <ChevronDown className={className} aria-hidden />;
  return (
    <ChevronsUpDown
      className={cx(className, "opacity-0 transition-opacity group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60")}
      aria-hidden
    />
  );
}

export function TableHeader<T>({
  columns,
  layout,
  sort,
  padding,
  onToggleSort,
}: TableHeaderProps<T>) {
  return (
    <thead>
      <tr>
        {columns.map((column, index) => {
          const { style, className } = getCellProps(
            column,
            layout,
            "head",
            index === columns.length - 1,
          );
          const direction = sort?.columnId === column.id ? sort.direction : null;

          return (
            <th
              key={column.id}
              scope="col"
              aria-sort={
                column.sortable
                  ? direction
                    ? ARIA_SORT[direction]
                    : "none"
                  : undefined
              }
              style={style}
              className={cx(
                "sticky top-0 truncate border-b border-line bg-zinc-50 text-left text-xs font-medium",
                direction ? "text-zinc-900" : "text-zinc-500",
                padding,
                className,
              )}
            >
              {column.sortable ? (
                <button
                  type="button"
                  onClick={() => onToggleSort(column.id)}
                  className="group/sort -mx-1 inline-flex max-w-full items-center gap-1 rounded px-1 transition-colors hover:text-zinc-900"
                >
                  <span className="truncate">{column.header}</span>
                  <SortGlyph direction={direction} />
                </button>
              ) : (
                column.header
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
