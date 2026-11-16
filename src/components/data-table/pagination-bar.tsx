import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { ReactNode } from "react";

type PaginationBarProps = {
  ariaLabel: string;
  loading: boolean;
  total: number;
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  pageSizeOptions: number[];
  onPageIndexChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function PaginationBar({
  ariaLabel,
  loading,
  total,
  pageIndex,
  pageSize,
  pageCount,
  pageSizeOptions,
  onPageIndexChange,
  onPageSizeChange,
}: PaginationBarProps) {
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min(total, (pageIndex + 1) * pageSize);
  const noNavigation = loading || total === 0;
  const onFirstPage = noNavigation || pageIndex === 0;
  const onLastPage = noNavigation || pageIndex >= pageCount - 1;

  return (
    <nav
      aria-label={`${ariaLabel} pagination`}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2.5"
    >
      {/* `aria-live` announces the new range to screen readers after a page change. */}
      <p aria-live="polite" className="text-[13px] text-zinc-500 tabular-nums">
        {loading
          ? "Loading…"
          : total === 0
            ? "No rows"
            : `${rangeStart}–${rangeEnd} of ${total}`}
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-zinc-500">
          Rows per page
          {/* The native arrow cannot be padded, so hide it and draw our own chevron. */}
          <span className="relative inline-flex">
            <select
              value={pageSize}
              disabled={loading}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 appearance-none rounded-md border border-line bg-surface pr-8 pl-2.5 text-[13px] text-zinc-900 disabled:opacity-50"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
          </span>
        </label>

        <div className="flex items-center gap-0.5">
          <PageButton
            label="First page"
            disabled={onFirstPage}
            onClick={() => onPageIndexChange(0)}
          >
            <ChevronsLeft className="size-4" aria-hidden />
          </PageButton>
          <PageButton
            label="Previous page"
            disabled={onFirstPage}
            onClick={() => onPageIndexChange(pageIndex - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </PageButton>
          <span className="min-w-14 px-1 text-center text-[13px] text-zinc-600 tabular-nums">
            {pageIndex + 1} / {pageCount}
          </span>
          <PageButton
            label="Next page"
            disabled={onLastPage}
            onClick={() => onPageIndexChange(pageIndex + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </PageButton>
          <PageButton
            label="Last page"
            disabled={onLastPage}
            onClick={() => onPageIndexChange(pageCount - 1)}
          >
            <ChevronsRight className="size-4" aria-hidden />
          </PageButton>
        </div>
      </div>
    </nav>
  );
}
