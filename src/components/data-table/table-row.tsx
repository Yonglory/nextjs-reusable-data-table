import { ChevronRight } from "lucide-react";
import { memo, type ReactNode } from "react";
import { cx } from "./cx";
import { ExpandedRow } from "./expanded-row";
import { getCellProps, type ColumnLayout } from "./pinned";
import type { ColumnDef } from "./types";

type TableRowProps<T> = {
  row: T;
  rowId: string;
  label: string;
  columns: ColumnDef<T>[];
  layout: ColumnLayout;
  padding: string;
  expandable: boolean;
  expanded: boolean;
  onToggle: (rowId: string) => void;
  /** Rendered content for the panel, or `null` when the row is collapsed. */
  expandedContent: ReactNode;
};

function renderCell<T>(column: ColumnDef<T>, row: T): ReactNode {
  if (column.cell) return column.cell(row);
  const value = column.accessor?.(row);
  if (value == null) return "—";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function TableRowImpl<T>({
  row,
  rowId,
  label,
  columns,
  layout,
  padding,
  expandable,
  expanded,
  onToggle,
  expandedContent,
}: TableRowProps<T>) {
  const panelId = `row-${rowId}-panel`;

  return (
    <>
      {/* Cells use `bg-inherit`, so the row's own hover colour also fills pinned cells. */}
      <tr className="bg-surface transition-colors hover:bg-zinc-50">
        {columns.map((column, index) => {
          const { style, className } = getCellProps(
            column,
            layout,
            "body",
            index === columns.length - 1,
          );
          const isFirst = index === 0;
          const Cell = isFirst ? "th" : "td";
          const content = renderCell(column, row);

          return (
            <Cell
              key={column.id}
              scope={isFirst ? "row" : undefined}
              style={style}
              className={cx(
                "border-b border-line bg-inherit text-left font-normal text-zinc-800",
                padding,
                column.align === "right" && "tabular-nums",
                className,
              )}
            >
              {isFirst && expandable ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={expanded ? panelId : undefined}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
                    onClick={() => onToggle(rowId)}
                    className="-ml-1 shrink-0 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900"
                  >
                    <ChevronRight
                      className={cx(
                        "size-4 transition-transform duration-200 motion-reduce:transition-none",
                        expanded && "rotate-90",
                      )}
                      aria-hidden
                    />
                  </button>
                  <div className="min-w-0 flex-1 truncate">{content}</div>
                </div>
              ) : (
                <div className="truncate">{content}</div>
              )}
            </Cell>
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

/**
 * Memoised so that expanding one row, or a parent re-render, does not repaint the
 * rest of the page. Every prop is stable between renders except for the rows that
 * actually changed.
 */
export const TableRow = memo(TableRowImpl) as typeof TableRowImpl;
