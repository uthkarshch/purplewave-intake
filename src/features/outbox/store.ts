import { IN_FLIGHT_PHASES, type OutboxRecord } from './types';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

const INDEX_KEY = 'outbox:index';
const RECORD_PREFIX = 'outbox:sub:';

// One storage key per submission so a write can never clobber another submission's state.
export class OutboxStore {
  private records = new Map<string, OutboxRecord>();
  private snapshot: OutboxRecord[] = [];
  private listeners = new Set<() => void>();
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private storage: KeyValueStorage) {}

  async load(): Promise<void> {
    const rawIndex = await this.storage.getItem(INDEX_KEY);
    const ids = new Set<string>(rawIndex ? JSON.parse(rawIndex) : []);
    for (const key of await this.storage.getAllKeys()) {
      if (key.startsWith(RECORD_PREFIX)) ids.add(key.slice(RECORD_PREFIX.length));
    }
    for (const id of ids) {
      const raw = await this.storage.getItem(RECORD_PREFIX + id);
      if (raw) this.records.set(id, JSON.parse(raw));
    }
    this.publish();
    await this.enqueueWrite(() => this.storage.setItem(INDEX_KEY, JSON.stringify([...this.records.keys()])));
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getSnapshot = (): OutboxRecord[] => this.snapshot;

  get(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  // Returns the existing record untouched when the id is already queued (double-tap guard).
  async add(record: OutboxRecord): Promise<OutboxRecord> {
    const existing = this.records.get(record.id);
    if (existing) return existing;
    this.records.set(record.id, record);
    this.publish();
    await this.enqueueWrite(async () => {
      await this.storage.setItem(RECORD_PREFIX + record.id, JSON.stringify(record));
      await this.storage.setItem(INDEX_KEY, JSON.stringify([...this.records.keys()]));
    });
    return record;
  }

  async update(id: string, patch: Partial<OutboxRecord>): Promise<OutboxRecord> {
    const current = this.records.get(id);
    if (!current) throw new Error(`Unknown outbox record: ${id}`);
    const next = { ...current, ...patch };
    this.records.set(id, next);
    this.publish();
    await this.enqueueWrite(() => this.storage.setItem(RECORD_PREFIX + id, JSON.stringify(next)));
    return next;
  }

  // A kill mid-request leaves an in-flight phase behind; every step is replayable, so requeue it.
  async resetInFlight(): Promise<void> {
    for (const record of this.records.values()) {
      if (IN_FLIGHT_PHASES.includes(record.phase)) await this.update(record.id, { phase: 'queued' });
    }
  }

  private enqueueWrite(op: () => Promise<void>): Promise<void> {
    const result = this.writeChain.then(op);
    this.writeChain = result.catch(() => undefined);
    return result;
  }

  private publish() {
    this.snapshot = [...this.records.values()].sort((a, b) => a.createdAt - b.createdAt);
    this.listeners.forEach((listener) => listener());
  }
}
