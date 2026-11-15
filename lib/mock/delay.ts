export function delay(ms: number) {
  const capped = Math.min(Math.max(ms, 0), 4000);
  return new Promise((resolve) => {
    setTimeout(resolve, capped);
  });
}

export function readLatency(value: string | null, fallback = 700) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}
