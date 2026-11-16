"use client";

import { SegmentedControl } from "./segmented-control";

export type Scenario = "ready" | "slow" | "error" | "empty" | "large";

const BASE_OPTIONS: Array<{ value: Scenario; label: string }> = [
  { value: "ready", label: "Normal" },
  { value: "slow", label: "Slow" },
  { value: "error", label: "Error" },
  { value: "empty", label: "Empty" },
];

const LARGE_OPTION = { value: "large" as const, label: "10k rows" };

/** Demo-only controls that let a reviewer trigger each table state on demand. */
export function ScenarioControls({
  scenario,
  onScenario,
  includeLarge = false,
  failChild,
  onFailChild,
  childLabel = "Fail child fetch",
}: {
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
  includeLarge?: boolean;
  failChild?: boolean;
  onFailChild?: (fail: boolean) => void;
  childLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedControl
        label="Load scenario"
        value={scenario}
        options={includeLarge ? [...BASE_OPTIONS, LARGE_OPTION] : BASE_OPTIONS}
        onChange={onScenario}
      />
      {onFailChild ? (
        <label className="flex items-center gap-2 text-[13px] text-zinc-600">
          <input
            type="checkbox"
            checked={failChild}
            onChange={(event) => onFailChild(event.target.checked)}
            className="size-4 rounded accent-accent"
          />
          {childLabel}
        </label>
      ) : null}
    </div>
  );
}
