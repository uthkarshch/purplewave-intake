import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

import type { EnqueueInput, OutboxRecord } from './types';

// What the UI needs from the outbox. runtime.ts builds the real one; tests pass a fake.
export type OutboxApi = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => OutboxRecord[];
  enqueue: (input: EnqueueInput) => Promise<unknown>;
  retry: (id: string) => Promise<unknown>;
};

const OutboxContext = createContext<OutboxApi | null>(null);

export function OutboxProvider({ api, children }: { api: OutboxApi; children: ReactNode }) {
  return <OutboxContext.Provider value={api}>{children}</OutboxContext.Provider>;
}

function useApi(): OutboxApi {
  const api = useContext(OutboxContext);
  if (!api) throw new Error('Outbox hooks must be used inside an OutboxProvider');
  return api;
}

export function useOutbox(): Pick<OutboxApi, 'enqueue' | 'retry'> {
  const { enqueue, retry } = useApi();
  return { enqueue, retry };
}

export function useOutboxRecords(): OutboxRecord[] {
  const { subscribe, getSnapshot } = useApi();
  return useSyncExternalStore(subscribe, getSnapshot);
}
