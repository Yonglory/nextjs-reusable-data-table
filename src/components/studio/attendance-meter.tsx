/** "12 / 15" with a thin fill bar. The bar is static (a width, no animation). */
export function AttendanceMeter({ booked, capacity }: { booked: number; capacity: number }) {
  const percent = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  return (
    <div className="flex items-center justify-end gap-2.5">
      <span className="tabular-nums">
        {booked} / {capacity}
      </span>
      <span aria-hidden className="h-1 w-12 shrink-0 overflow-hidden rounded-full bg-zinc-100">
        <span
          className={`block h-full rounded-full ${percent >= 100 ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}
