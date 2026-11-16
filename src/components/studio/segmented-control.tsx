"use client";

import { cx } from "@/components/data-table/cx";

type Option<V extends string> = {
  value: V;
  label: string;
  disabled?: boolean;
};

/** Small toggle group. Plain buttons with `aria-pressed`, so Tab and Space/Enter just work. */
export function SegmentedControl<V extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: Option<V>[];
  onChange: (value: V) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-lg bg-zinc-100 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              selected
                ? "bg-surface text-zinc-900 shadow-[0_0_0_1px_var(--line)]"
                : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
