export type TriggerSources = {
  onForeground: (cb: () => void) => () => void;
  onReachable: (cb: () => void) => () => void;
  intervalMs: number;
};

// Every trigger is only a hint to try now; request outcomes, not these signals, decide backoff.
export function attachTriggers(requestDrain: () => void, sources: TriggerSources): () => void {
  const unsubscribe = [sources.onForeground(requestDrain), sources.onReachable(requestDrain)];
  const timer = setInterval(requestDrain, sources.intervalMs);
  return () => {
    unsubscribe.forEach((off) => off());
    clearInterval(timer);
  };
}
