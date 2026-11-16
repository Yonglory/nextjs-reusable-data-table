type Tone = "green" | "amber" | "red" | "blue" | "violet" | "gray";

const DOT: Record<Tone, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
  violet: "bg-violet-500",
  gray: "bg-zinc-400",
};

const TONES: Record<string, Tone> = {
  Scheduled: "green",
  Full: "amber",
  Cancelled: "red",
  Active: "green",
  Paused: "amber",
  Expired: "gray",
  Booked: "blue",
  "Checked-in": "green",
  "No-show": "gray",
  "One-time": "gray",
  Package: "violet",
  Membership: "green",
};

/** Neutral pill with a coloured dot. The label carries the meaning; the dot is a hint. */
export function StatusBadge({ value }: { value: string }) {
  const tone = TONES[value] ?? "gray";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-zinc-700">
      <span aria-hidden className={`size-1.5 rounded-full ${DOT[tone]}`} />
      {value}
    </span>
  );
}
