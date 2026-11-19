import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { getApiBaseUrl } from '@/config';
import { expoFiles, expoPutPhoto, foregroundEvents } from './expo';
import { createHttpTransport } from './httpTransport';
import { OutboxProcessor } from './processor';
import { OutboxStore } from './store';
import { attachTriggers } from './triggers';
import type { EnqueueInput, OutboxRecord } from './types';

const store = new OutboxStore(AsyncStorage);
const processor = new OutboxProcessor({
  store,
  transport: createHttpTransport({ baseUrl: getApiBaseUrl(), putPhoto: expoPutPhoto }),
  files: expoFiles,
});

let started: Promise<void> | undefined;

// Safe to call from several places; the outbox starts once per JS runtime.
export function startOutbox(): Promise<void> {
  started ??= (async () => {
    attachTriggers(() => void processor.requestDrain(), {
      onForeground: foregroundEvents,
      onReachable: (cb) =>
        NetInfo.addEventListener((state) => {
          if (state.isConnected && state.isInternetReachable !== false) cb();
        }),
      intervalMs: 60_000,
    });
    await processor.start();
  })();
  return started;
}

export const outbox = processor;

// Waits for persisted state to load so a fast first submit cannot race the boot-time reload.
export async function enqueueSubmission(input: EnqueueInput): Promise<OutboxRecord> {
  await startOutbox();
  return processor.enqueue(input);
}

export function useOutboxRecords(): OutboxRecord[] {
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
