import { OutboxStore } from './store';
import { memoryStorage } from './testing';
import type { OutboxRecord } from './types';

const record = (id: string, overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  id,
  categoryId: 'excavator',
  schemaVersion: 1,
  fields: {},
  photos: [],
  createdAt: Number(id.replace(/\D/g, '')) || 0,
  phase: 'queued',
  attempts: 0,
  nextAttemptAt: 0,
  ...overrides,
});

test('persists each submission under its own key and reloads them in creation order', async () => {
  const storage = memoryStorage();
  const store = new OutboxStore(storage);
  await store.add(record('b2'));
  await store.add(record('a1'));

  expect([...storage.data.keys()].sort()).toEqual(['outbox:index', 'outbox:sub:a1', 'outbox:sub:b2']);

  const reloaded = new OutboxStore(storage);
  await reloaded.load();
  expect(reloaded.getSnapshot().map((r) => r.id)).toEqual(['a1', 'b2']);
});

test('add returns the existing record untouched for a duplicate id', async () => {
  const store = new OutboxStore(memoryStorage());
  const first = await store.add(record('a1', { fields: { v: 1 } }));
  const second = await store.add(record('a1', { fields: { v: 2 } }));

  expect(second).toBe(first);
  expect(store.getSnapshot()).toHaveLength(1);
});

test('concurrent updates never lose a write and the last one wins in storage', async () => {
  const storage = memoryStorage();
  const store = new OutboxStore(storage);
  await store.add(record('a1'));

  await Promise.all([
    store.update('a1', { attempts: 1 }),
    store.update('a1', { lastError: 'x' }),
    store.update('a1', { attempts: 2 }),
  ]);

  expect(JSON.parse(storage.data.get('outbox:sub:a1')!)).toMatchObject({ attempts: 2, lastError: 'x' });
});

test('load recovers a record whose index entry was never written', async () => {
  const storage = memoryStorage();
  storage.data.set('outbox:sub:a1', JSON.stringify(record('a1')));
  storage.data.set('outbox:index', JSON.stringify([]));

  const store = new OutboxStore(storage);
  await store.load();

  expect(store.getSnapshot().map((r) => r.id)).toEqual(['a1']);
  expect(JSON.parse(storage.data.get('outbox:index')!)).toEqual(['a1']);
});

test('resetInFlight requeues interrupted records only', async () => {
  const store = new OutboxStore(memoryStorage());
  await store.add(record('a1', { phase: 'uploading' }));
  await store.add(record('b2', { phase: 'submitted' }));
  await store.add(record('c3', { phase: 'needs-attention' }));

  await store.resetInFlight();

  expect(store.getSnapshot().map((r) => r.phase)).toEqual(['queued', 'submitted', 'needs-attention']);
});

test('notifies subscribers with a new snapshot identity on change', async () => {
  const store = new OutboxStore(memoryStorage());
  const listener = jest.fn();
  store.subscribe(listener);
  const before = store.getSnapshot();

  await store.add(record('a1'));

  expect(listener).toHaveBeenCalled();
  expect(store.getSnapshot()).not.toBe(before);
});

test('a failed write rejects but keeps the in-memory state and later writes still run', async () => {
  const storage = memoryStorage();
  const store = new OutboxStore(storage);
  await store.add(record('a1'));

  const realSet = storage.setItem;
  storage.setItem = jest.fn().mockRejectedValueOnce(new Error('disk full'));
  await expect(store.update('a1', { attempts: 1 })).rejects.toThrow('disk full');
  expect(store.get('a1')?.attempts).toBe(1);

  storage.setItem = realSet;
  await store.update('a1', { attempts: 2 });
  expect(JSON.parse(storage.data.get('outbox:sub:a1')!).attempts).toBe(2);
});
