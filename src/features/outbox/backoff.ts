export const MIN_DELAY_MS = 250;
export const BASE_DELAY_MS = 1_000;
export const MAX_BACKOFF_MS = 5 * 60_000;

// Full jitter over an exponential ceiling; a server-provided Retry-After is a floor, still capped.
export function computeBackoff(attempts: number, random: () => number, retryAfterMs = 0): number {
  const ceiling = Math.min(MAX_BACKOFF_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.min(MAX_BACKOFF_MS, Math.max(MIN_DELAY_MS, random() * ceiling, retryAfterMs));
}
