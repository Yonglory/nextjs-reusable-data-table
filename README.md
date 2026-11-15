# Forma Studio data table

A reusable, fully typed data table built from scratch for a fitness-studio staff dashboard. There is no table library. The same component renders the class timetable and a differently shaped member directory.

## Deploy

```bash
npx vercel login
npx vercel --prod
```

The production build is `npm run build`. After the project is linked, add the live URL here.

## Setup

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the class timetable. Open [http://localhost:3000/demo](http://localhost:3000/demo) for the members demo.

```bash
npm run lint
npm run build
```

The timetable and directory are backed by route handlers under `app/api`. Those handlers read deterministic mock data and wait before responding, so skeleton rows are visible. There is no database.

## Component API

`DataTable<T>` lives in `components/data-table`. Columns are data, not hard-coded markup.

```ts
type ColumnDef<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => string | number | Date | null | undefined;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: number;
  pinned?: boolean;
  align?: "left" | "right";
};
```

- `accessor` supplies the sort value. `cell` supplies the display. A status column can sort by a rank number and still render a badge.
- `sortable` opts a column into the header button. A column without an accessor is ignored even if a sort state names it.
- `width` is a pixel width. Pinned columns need a width so the next pinned column can stack to the right of it.
- `pinned` sticks the column to the left.
- `getRowId` is required so expansion, keys, and requests stay stable.

Sort and pagination are uncontrolled unless you pass `sort` or `pagination`. Pass `onSortChange` / `onPaginationChange` to observe either mode.

| Prop | Role |
| --- | --- |
| `defaultSort`, `sort`, `onSortChange` | Uncontrolled initial sort, or a controlled sort state |
| `manualSorting` | Skip client sorting and let the parent supply ordered rows |
| `defaultPagination`, `pagination`, `onPaginationChange` | Same pattern for `{ pageIndex, pageSize }` |
| `manualPagination` + `rowCount` | Render `data` as one server page and use `rowCount` as the total |
| `paginate={false}` | Render every row and hide the footer. Used for short child tables |
| `status` | `"loading"`, `"error"`, or `"ready"` |
| `expandable` | Inline or on-demand child content, typed separately from `T` |

An unknown sort id, a non-sortable id, or a direction other than `"asc"` or `"desc"` is treated as no sort. `pageIndex` below 0 or past the last page is clamped once `status` is `"ready"`. Page size choices are 10, 25, and 50.

Header clicks cycle ascending, descending, then none. Client-side sorts also return to the first page.

## Client-side vs server-side

The table does not know whether a page is local or remote. The parent decides.

**Client-side (class timetable).** The API returns the full list of 240 classes. The table sorts with a stable `toSorted` and slices the current page. Only that page is rendered.

**Server-side (members).** `manualSorting` and `manualPagination` are set. The table emits sort and page changes. The page refetches `GET /api/members?page&pageSize&sort&dir` and passes back one page plus `total`. The handler uses the same sort helper as the table, and ignores an unknown sort key. An out-of-range page is clamped in the handler and in the table.

Changing the members sort resets `pageIndex` to 0 in the page, because the new order makes the old offset meaningless.

## Expandable rows

Child rows are a different type from the parent. Attendees are not classes, and visits are not members, so expansion is not a recursive row of `T`.

`expandable.renderSubRows` paints one table row whose cell spans every column. Inside it, both demos render another `DataTable` for the child shape.

**Inline.** `getSubRows(row)` reads children that arrived with the parent (`GET /api/classes` includes `attendees`). An empty array renders the empty state immediately. There is no spinner.

**On demand.** The list request omits attendees (`includeAttendees=0`). The first expand calls `loadSubRows`, which hits `GET /api/classes/[id]/attendees` or `GET /api/members/[id]/visits`. The table caches that result. A later collapse and expand does not refetch. The retry button clears the failure by calling the loader again. States are a skeleton table, an error with retry, an empty roster, or the child rows.

The expanded region animates with a CSS grid from `0fr` to `1fr`. `prefers-reduced-motion: reduce` disables the transition.

## Sticky column

The table sits in a scroll container with a max height, so the header sticks vertically and wide tables scroll horizontally. Pinned cells use `position: sticky` and a `left` offset. One pinned column uses `left: 0`. A second pinned column uses the width of the first. When `scrollLeft > 0`, the last pinned column gets a shadow so content sliding underneath is visible. The expand control sits inside the first cell, so it stays pinned with the class or member name instead of becoming its own column.

Pinned cells use an opaque background, including on row hover, so scrolled text does not show through.

## State management

Table UI state lives in `useDataTable`. That includes the current sort, page, which rows are open, and the on-demand cache. Screen state lives next to the fetch: the timetable owns its scenario and expansion mode, and the members page owns the sort and page it sends to the API.

There is no global store. The two screens do not share rows, and the cache is only meaningful while that table is mounted. Lifting sort and page into the members page is what makes the same component controlled. Leaving them inside the hook is what makes the timetable uncontrolled. A store would add a layer that neither screen reads.

## Tradeoffs and assumptions

- Child content spans the parent width instead of sharing the parent columns. Attendees and visits do not line up with class or member columns, and a nested table keeps both shapes column-driven.
- Pagination, not windowing, keeps the DOM small. A page is at most 50 rows. Sorting 240 classes or asking the server for one page of 500 members stays cheap. A virtualizer would matter for an unpaged list of thousands of DOM rows, which this UI does not render.
- On-demand results stay cached until retry or until the table unmounts. Switching the timetable between inline and on-demand remounts the table so a stale cache cannot be shown for the other mode. The assumption is that roster data does not change during the session unless the user asks for a new fetch.
- The sort cycle includes a cleared state, because the brief asks for asc / desc / none rather than a two-way toggle.
- Latency is artificial (about 700ms, or 1.8s on Slow) so loading skeletons can be reviewed. `fail=1` and `empty=1` on the list routes, and the child-fetch checkboxes, exist for the same reason.
- Status sorts by an explicit rank (Scheduled, Full, Cancelled and Active, Paused, Expired), not alphabetically. Attendance sorts by the booked count, and time sorts by the start minute. The cell can format those values however it likes.
- One left pin is what the screens use. The offset math supports more than one left-pinned column. Right pinning is not implemented.
- The app is light-themed on purpose so pinned cells and the off-white canvas stay consistent.
