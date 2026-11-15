const tones: Record<string, string> = {
  Scheduled: "bg-emerald-50 text-emerald-800",
  Full: "bg-amber-50 text-amber-900",
  Cancelled: "bg-rose-50 text-rose-800",
  Active: "bg-emerald-50 text-emerald-800",
  Paused: "bg-amber-50 text-amber-900",
  Expired: "bg-stone-200 text-stone-600",
  Booked: "bg-sky-50 text-sky-800",
  "Checked-in": "bg-emerald-50 text-emerald-800",
  "No-show": "bg-stone-200 text-stone-600",
  "One-time": "bg-stone-100 text-stone-700",
  Package: "bg-violet-50 text-violet-800",
  Membership: "bg-emerald-50 text-emerald-800",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[value] ?? "bg-stone-100 text-stone-700"}`}
    >
      {value}
    </span>
  );
}
