# Forma Studio data table

A reusable, fully typed data table built from scratch for a fitness-studio staff dashboard. There is no table library. One generic `DataTable<T>` renders the class timetable (client-side) and a differently shaped member directory (server-side).

| Screen | Route | Data shape | Sort and paging | Child rows |
| --- | --- | --- | --- | --- |
| Class timetable | `/` | classes with attendees | client-side | inline, or on demand |
| Members | `/demo` | members with visits | server-side | on demand |

## Setup

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

There is no database. The "APIs" are route handlers under `src/app/api` that read deterministic mock data and wait 700ms before answering, so the loading states are visible. Each demo page has scenario controls (Normal, Slow, Error, Empty, and 10k rows on the timetable) and a "Fail child fetch" checkbox to trigger each state on purpose.

The app is not deployed. `npm run build` produces a production build, and `npx vercel` deploys it.

## Project layout

```
src/
  app/              routes, layout, globals.css, api/ (mock endpoints)
  components/
    data-table/     the reusable table. Imports nothing from studio/ or lib/mock
    shell/          app chrome (top bar, page header)
    studio/         the two screens and their column definitions
  lib/              mock data, artificial delay, date formatting
```

The rule that makes the component "generic" is enforceable: nothing in `components/data-table` imports from `components/studio` or `lib/mock`.

Inside `components/data-table`, each file does one job:

| File | Job |
| --- | --- |
| `types.ts` | The public API: `ColumnDef`, `DataTableProps`, `ExpandConfig` |
| `use-data-table.ts` | All state: sort, page, expanded rows, child-row cache |
| `sort.ts`, `paginate.ts` | Pure functions, no React |
| `data-table.tsx` | Wires the hook to the UI parts below |
| `table-header.tsx`, `table-row.tsx`, `expanded-row.tsx`, `table-states.tsx`, `pagination-bar.tsx` | Presentational parts |
| `pinned.ts` | One helper that decides every cell's width, sticky position and layer |
| `use-scroller-effects.ts`, `use-delayed-unmount.ts` | Two small hooks (scroll shadow and width, exit animation) |

## Component API

Columns are data, not markup.

```ts
type ColumnDef<T> = {
  id: string;
  header: string;
  accessor?: (row: T) => string | number | Date | null | undefined; // value used for sorting
  cell?: (row: T) => React.ReactNode;                               // what is displayed
  sortable?: boolean;
  width?: number;                                                   // px
  pinned?: boolean;                                                 // sticks to the left
  align?: "left" | "right";
};
```

- `accessor` is the sort value and `cell` is the display. They are separate on purpose: Status sorts by a rank number but renders a badge, Time sorts by start minute but renders "10:00 AM – 11:00 AM".
- `sortable` only works if the column has an `accessor`. An unknown column id, a non-sortable column or a bad direction is treated as "no sort".
- `getRowId` is required, so keys, expansion and requests stay stable across sorting and paging.
- Define `columns` outside the component (or memoise them). Their identity is what lets the table skip recomputing its layout.

```tsx
<DataTable
  columns={classColumns}
  data={rows}
  getRowId={(row) => row.id}
  status="ready"               // "loading" | "error" | "ready"
  ariaLabel="Class timetable"
  defaultSort={{ columnId: "time", direction: "asc" }}
  expandable={{ mode: "inline", getSubRows, renderSubRows }}
/>
```

| Prop | Purpose |
| --- | --- |
| `status`, `errorMessage`, `onRetry`, `emptyTitle`, `emptyDescription` | Loading, error and empty states |
| `defaultSort` / `sort` + `onSortChange` | Uncontrolled / controlled sort |
| `defaultPagination` / `pagination` + `onPaginationChange` | Uncontrolled / controlled `{ pageIndex, pageSize }` |
| `manualSorting` | The parent supplies already-sorted rows |
| `manualPagination` + `rowCount` | `data` is one server page, `rowCount` is the total |
| `paginate={false}` | Show every row, no footer (used for short child tables) |
| `expandable` | Inline or on-demand child rows. The child type is its own generic, `TChild` |
| `maxHeight`, `density`, `skeletonRowCount`, `pageSizeOptions` | Presentation |

## Client-side vs server-side

The table never knows where its data came from. Two independent switches decide who does the work:

| | Controlled or not | `manual*` flag | Who sorts or slices |
| --- | --- | --- | --- |
| Timetable | uncontrolled | off | the table (240 or 10,000 rows) |
| Members | controlled | `manualSorting`, `manualPagination` | the API |

**Client-side (timetable).** The full list is loaded once. The table sorts with a stable sort and renders one page slice. A new sort goes back to page 1.

**Server-side (members).** The page owns `sort` and `pagination`. The table only reports changes. The page rebuilds the URL (`/api/members?page&pageSize&sort&dir`), refetches, and passes back one page plus `rowCount`. The page also resets to page 1 when the sort changes, because the old offset no longer means anything.

**Bad input.** An invalid sort key is ignored (the server route ignores it too). A controlled page that is out of range is clamped once data is ready, and the table calls `onPaginationChange` with the clamped value so the parent's state heals as well. In the demo you can see it: go to the last page, then switch to "Empty", and the page snaps back to 1.

## Expandable rows

Child rows are a different type from parent rows (attendees are not classes), so expansion is not a recursive `T`. `renderSubRows` returns the content of one full-width row, and both demos render another `DataTable` inside it for the child shape.

```ts
type ExpandConfig<TParent, TChild> = {
  mode: "inline" | "onDemand";
  getSubRows?: (row: TParent) => TChild[];              // inline
  loadSubRows?: (row: TParent) => Promise<TChild[]>;    // on demand
  renderSubRows: (ctx: { rows; status; error?; retry }) => ReactNode;
};
```

**Inline.** Children arrive with the parent (`GET /api/classes` includes `attendees`). `getSubRows` reads them. An empty list shows the empty state straight away; there is no spinner.

**On demand.** The list request leaves attendees out. Expanding a row makes the table call `loadSubRows` once and cache the result by row id. The child table then shows:

- loading: skeleton rows in the child's own column layout
- error: a message and a "Try again" button (`retry` clears the cache entry and refetches)
- empty: "No attendees booked"
- ready: the rows

A request counter per row means a slow earlier response can never overwrite a newer retry. Collapsing and re-expanding does not refetch. The 10k scenario forces this mode, because sending attendees for 10,000 classes would be a very large payload.

**Animation.** The panel animates by transitioning a CSS grid row from `0fr` to `1fr`, so no JavaScript measures heights. `useDelayedUnmount` keeps the panel mounted until the close transition ends. With `prefers-reduced-motion` the transition is off.

## Sticky (pinned) column

- The scroller is the only element that scrolls. Pinned cells use `position: sticky` with a `left` offset, and the header row sticks to the top.
- `pinned.ts` computes the offsets as CSS strings. One pinned column is `left: 0`; a second stacks at `calc(width of the first)`.
- **Scroll cue.** A small hook toggles a `data-scrolled` attribute on the scroller, and CSS turns that into a shadow on the last pinned column. React state is not involved, so scrolling never re-renders rows.
- **Opaque cells.** Pinned cells inherit the row background (`bg-inherit`), so scrolled content never shows through, including on hover.
- **Narrow screens.** A pinned column is capped at 45% of the viewport (`min(240px, 45vw)`), so on a 375px phone the Class column is about 169px wide and text truncates, instead of taking the whole screen.
- **Spare width.** The table uses `table-layout: fixed`, and the last column has no fixed width. It absorbs extra space, so pinned offsets never drift on wide screens.
- **Full-width content.** Expanded panels and empty or error states live in a `colSpan` cell as wide as the whole table. A "viewport box" (`sticky; left: 0; width: --dt-viewport`) keeps them in view while the table is scrolled sideways.

## State management

Table UI state lives in one hook, `useDataTable`: sort, page, which rows are open, and the child-row cache. Screen state lives next to the fetch: the timetable owns its scenario and expansion mode, and the members page owns the sort and page it sends to the API.

There is no global store. The screens do not share rows, and the child cache is only valid while its table is mounted. The controlled/uncontrolled pattern (same as a React `<input>`) is what lets one component serve both screens: the timetable leaves sort and page inside the hook, the members page lifts them up.

Alternatives I rejected: a store such as Zustand or Redux (nothing is shared between screens, so it adds a layer nobody reads), and `useReducer` (the state is a few independent pieces, so separate `useState` calls are easier to follow).

## Performance

- **One-pass sort.** `sortRows` calls each column's accessor once per row, then sorts row positions. That is N accessor calls instead of about N log N. It also uses one shared `Intl.Collator`, since `localeCompare` with options builds a new collator on every call. Measured in a dev build on the 10k scenario, sorting costs about 10ms of CPU.
- **Small DOM.** Pagination caps the rendered rows at 50 (default page size 10), so 10,000 rows is still 10 table rows in the DOM.
- **Memoised rows.** `TableRow` is wrapped in `React.memo`, and all of its props are stable (`toggleRow`, column layout, column definitions). Expanding a row repaints that row, not the page.
- **No work on scroll or resize.** Scroll shadow and viewport width are written straight to the DOM.
- **Cheap design.** No blur, backdrop filters, gradients or big shadows. Transitions are limited to colour, opacity and transform, plus the single height transition on the expanded panel.
- **Fixed table layout** means the browser does not measure every cell to size columns.

## Accessibility

- Semantic `<table>`, `<th scope="col">`, and the first cell of each row is a `<th scope="row">`.
- `aria-sort` on sortable headers, which are real `<button>`s. `aria-busy` while loading, and a visually hidden `role="status"` announces loading.
- Expand buttons have `aria-expanded`, a label that names the row ("Expand Yoga Flow"), and `aria-controls` while the panel exists.
- The page range ("11–20 of 240") is `aria-live="polite"`, and error states use `role="alert"`.
- One focus ring (`:focus-visible`) for every control. Everything is reachable with Tab, and Enter or Space activates it.
- Text colours are zinc-500 or darker on white or zinc-50, which meets WCAG AA for the sizes used.

## Design

Neutral, Linear/Vercel-style: zinc greys, hairline borders, one indigo accent, small type, 40px rows, and dot-style status badges. The look is light only on purpose, to keep one palette to verify; dark mode would be a token swap in `globals.css`.

## Tradeoffs and assumptions

- **Pagination instead of virtualisation.** Paging keeps the DOM small and keeps sticky headers, expansion and `colSpan` rows simple. Virtualising rows of different heights (expanded panels) is a lot of complexity. It would matter for an unpaged list of thousands of rows, which this UI does not render.
- **Child rows span the parent width** instead of sharing parent columns. Attendees and visits do not line up with class or member columns, and a nested table keeps both shapes column-driven.
- **Child cache lives and dies with the table.** It is cleared by retry or unmount. The assumption is that rosters do not change during a session unless the user asks again. Switching the timetable between inline and on-demand remounts the table, so a stale cache cannot leak across modes.
- **Sort cycle includes "none"**, because the brief asks for asc / desc / none.
- **Status sorts by rank** (Scheduled, Full, Cancelled), not alphabetically; attendance sorts by booked count. Display and sort values are separate by design.
- **Server loading replaces rows with a skeleton** on every sort or page change. That is simple and matches the brief; keeping the old rows dimmed while refetching would feel smoother and is listed below.
- **Pinned columns must come first** in `columns`, and only left pinning exists.
- **Mock data is deterministic** (seeded generator), so the demo behaves the same on every run. The 10k scenario generates rows on the server and serves attendees for any generated class id.

## What I would do next

- Keep previous rows visible, dimmed, while a server page reloads.
- Row virtualisation for unpaged huge lists.
- Column resizing and a column visibility menu.
- Multi-column sort and URL-synced sort and page.
- Right-pinned columns and arrow-key navigation between cells.
- Dark theme (token swap) and unit tests for `sort.ts` and `paginate.ts`.

## Walkthrough for the interviewer

1. **`types.ts`.** The API in 70 lines: `ColumnDef<T>`, controlled and uncontrolled props, `ExpandConfig<TParent, TChild>`.
2. **`use-data-table.ts`.** Where all state lives and why: controlled vs uncontrolled, the clamp, the on-demand cache with a request counter.
3. **`sort.ts` and `paginate.ts`.** Small pure functions, easy to reason about and test.
4. **`data-table.tsx`.** Pure composition. Then `pinned.ts` for the sticky column maths.
5. **`timetable-dashboard.tsx`.** The uncontrolled client-side example with both expansion modes and the 10k scenario.
6. **`members-dashboard.tsx`.** The controlled server-side example: the same table, a different shape, and sort and page owned by the parent.
