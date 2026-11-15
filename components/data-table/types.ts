import type { ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export type SortState = {
  columnId: string;
  direction: SortDirection;
} | null;

export type PaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type SortValue = string | number | Date | null | undefined;

export type ColumnAlign = "left" | "right";

export type ColumnDef<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => SortValue;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number;
  pinned?: boolean;
  align?: ColumnAlign;
};

export type TableStatus = "loading" | "error" | "ready";

export type SubRowStatus = "loading" | "error" | "empty" | "ready";

export type SubRowRenderContext<TParent, TChild> = {
  parent: TParent;
  rows: TChild[];
  status: SubRowStatus;
  error?: string;
  retry: () => void;
};

export type ExpandConfig<TParent, TChild> = {
  mode: "inline" | "onDemand";
  getSubRows?: (row: TParent) => TChild[];
  loadSubRows?: (row: TParent) => Promise<TChild[]>;
  renderSubRows: (context: SubRowRenderContext<TParent, TChild>) => ReactNode;
};

export type DataTableProps<T, TChild = unknown> = {
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T) => string;
  getRowLabel?: (row: T) => string;
  status?: TableStatus;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sort?: SortState;
  defaultSort?: SortState;
  onSortChange?: (sort: SortState) => void;
  manualSorting?: boolean;
  pagination?: PaginationState;
  defaultPagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  manualPagination?: boolean;
  rowCount?: number;
  pageSizeOptions?: number[];
  paginate?: boolean;
  expandable?: ExpandConfig<T, TChild>;
  ariaLabel: string;
  skeletonRowCount?: number;
  /** Pixel cap for the scroll region. `null` leaves height to the content. */
  maxHeight?: number | null;
  density?: "comfortable" | "compact";
};
