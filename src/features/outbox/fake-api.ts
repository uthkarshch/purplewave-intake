import type { OutboxApi } from './OutboxProvider';
import type { OutboxRecord } from './types';

type Handlers = Partial<Pick<OutboxApi, 'enqueue' | 'retry'>>;

// Records can be swapped mid-test with setRecords; subscribers are notified like the real store.
export function fakeOutboxApi(initial: OutboxRecord[] = [], handlers: Handlers = {}) {
  let records = initial;
  const listeners = new Set<() => void>();

  const api: OutboxApi & { setRecords: (next: OutboxRecord[]) => void } = {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    getSnapshot: () => records,
    enqueue: handlers.enqueue ?? (async () => undefined),
    retry: handlers.retry ?? (async () => undefined),
    setRecords: (next) => {
      records = next;
      listeners.forEach((l) => l());
    },
  };
  return api;
}
