import { CircleAlert, Inbox, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { getCellProps, type ColumnLayout } from "./pinned";
import type { ColumnDef } from "./types";
import { ViewportBox } from "./viewport-box";

// Different widths per row and column so the skeleton looks like real content.
const SKELETON_WIDTHS = ["62%", "78%", "48%", "86%", "70%"];

type SkeletonRowsProps<T> = {
  columns: ColumnDef<T>[];
  layout: ColumnLayout;
  count: number;
  padding: string;
};

/** Placeholder rows built from the same column layout as real rows, so nothing shifts. */
export function SkeletonRows<T>({ columns, layout, count, padding }: SkeletonRowsProps<T>) {
  return Array.from({ length: count }, (_, rowIndex) => (
    <tr key={rowIndex} aria-hidden className="bg-surface">
      {columns.map((column, columnIndex) => {
        const { style, className } = getCellProps(
          column,
          layout,
          "body",
          columnIndex === columns.length - 1,
        );
        return (
          <td
            key={column.id}
            style={style}
            className={cx("border-b border-line bg-inherit", padding, className)}
          >
            <div
              className={cx(
                "h-3.5 animate-pulse rounded bg-zinc-100",
                column.align === "right" && "ml-auto",
              )}
              style={{ width: SKELETON_WIDTHS[(rowIndex + columnIndex) % SKELETON_WIDTHS.length] }}
            />
          </td>
        );
      })}
    </tr>
  ));
}

type StateRowProps = {
  colSpan: number;
  tone: "neutral" | "error";
  title: string;
  description: string;
  action?: ReactNode;
};

/** Shared layout for the empty and error states. */
function StateRow({ colSpan, tone, title, description, action }: StateRowProps) {
  const Icon = tone === "error" ? CircleAlert : Inbox;
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <ViewportBox>
          <div
            role={tone === "error" ? "alert" : undefined}
            className="mx-auto flex max-w-sm flex-col items-center px-4 py-12 text-center"
          >
            <span
              className={cx(
                "flex size-9 items-center justify-center rounded-lg border",
                tone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-line bg-zinc-50 text-zinc-500",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>
            <p className="mt-1 text-[13px] leading-5 text-zinc-500">{description}</p>
            {action}
          </div>
        </ViewportBox>
      </td>
    </tr>
  );
}

export function EmptyRow({
  colSpan,
  title,
  description,
}: {
  colSpan: number;
  title: string;
  description: string;
}) {
  return <StateRow colSpan={colSpan} tone="neutral" title={title} description={description} />;
}

export function ErrorRow({
  colSpan,
  message,
  onRetry,
}: {
  colSpan: number;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <StateRow
      colSpan={colSpan}
      tone="error"
      title="Could not load rows"
      description={message}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            <RotateCw className="size-3.5" aria-hidden />
            Try again
          </button>
        ) : null
      }
    />
  );
}
