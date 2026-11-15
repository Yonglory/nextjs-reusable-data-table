"use client";

export type Scenario = "ready" | "slow" | "error" | "empty";

const scenarios: Array<{ id: Scenario; label: string }> = [
  { id: "ready", label: "Normal" },
  { id: "slow", label: "Slow" },
  { id: "error", label: "Error" },
  { id: "empty", label: "Empty" },
];

export function ScenarioControls({
  scenario,
  onScenario,
  failChild,
  onFailChild,
  childLabel = "Fail next child fetch",
}: {
  scenario: Scenario;
  onScenario: (scenario: Scenario) => void;
  failChild?: boolean;
  onFailChild?: (fail: boolean) => void;
  childLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-label="Load scenario"
        className="flex flex-wrap gap-1 rounded-full bg-stone-100 p-1"
      >
        {scenarios.map((item) => {
          const selected = scenario === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onScenario(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? "bg-surface font-medium text-foreground shadow-sm"
                  : "text-stone-600 hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {onFailChild ? (
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={failChild}
            onChange={(event) => onFailChild(event.target.checked)}
            className="size-4 accent-accent"
          />
          {childLabel}
        </label>
      ) : null}
    </div>
  );
}
