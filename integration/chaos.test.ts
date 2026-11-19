import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createHttpTransport } from '../src/outbox/httpTransport';
import { OutboxProcessor } from '../src/outbox/processor';
import { OutboxStore } from '../src/outbox/store';
import { memoryStorage } from '../src/outbox/testing';
import type { Transport } from '../src/outbox/transport';
import type { EnqueueInput } from '../src/outbox/types';
import { startServer } from './harness';
import { nodeFiles, nodePutPhoto, writePhoto } from './support';

const FAST_LATENCY: [number, number] = [0, 20];

let server: Awaited<ReturnType<typeof startServer>>;
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pw-chaos-'));
});

afterEach(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntil(condition: () => boolean, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for the outbox to settle');
    await sleep(10);
  }
}

const settled = (store: OutboxStore, count: number) => {
  const records = store.getSnapshot();
  return records.length === count && records.every((r) => r.phase === 'submitted' || r.phase === 'needs-attention');
};

const realTransport = () =>
  createHttpTransport({
    baseUrl: server.baseUrl,
    putPhoto: nodePutPhoto,
    metadataTimeoutMs: 400,
    photoBaseTimeoutMs: 600,
  });

const buildProcessor = (store: OutboxStore, transport: Transport = realTransport()) =>
  new OutboxProcessor({ store, transport, files: nodeFiles, backoff: () => 5 });

async function makeInputs(count: number): Promise<EnqueueInput[]> {
  return Promise.all(
    Array.from({ length: count }, async (_, i) => ({
      id: `sub-${i}`,
      categoryId: 'excavator',
      schemaVersion: 1,
      fields: { serial: `SN-${i}` },
      photos: [
        await writePhoto(dir, `sub-${i}-p0`, `photo zero of ${i}`),
        await writePhoto(dir, `sub-${i}-p1`, `photo one of ${i}`),
      ],
    })),
  );
}

async function expectDeliveredExactlyOnce(inputs: EnqueueInput[]) {
  const stored = await server.v1Submissions();
  expect(stored).toHaveLength(inputs.length);
  for (const input of inputs) {
    const matches = stored.filter((s) => s.fields.serial === input.fields.serial);
    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe('finalized');
    expect(matches[0].storedPhotos.map((p) => p.sha256).sort()).toEqual(input.photos.map((p) => p.sha256).sort());
  }
}

describe.each([
  ['flaky-wifi', { preset: 'flaky-wifi', latencyMs: FAST_LATENCY, seed: 7 }],
  ['lost-ack-heavy', { preset: 'lost-ack-heavy', seed: 11 }],
])('outbox under %s', (_name, chaos) => {
  test('delivers every submission exactly once with byte-identical photos', async () => {
    server = await startServer();
    await server.setChaos(chaos);
    const store = new OutboxStore(memoryStorage());
    const processor = buildProcessor(store);
    const inputs = await makeInputs(30);

    for (const input of inputs) await processor.enqueue(input);
    await waitUntil(() => settled(store, inputs.length));

    expect(store.getSnapshot().every((r) => r.phase === 'submitted')).toBe(true);
    await expectDeliveredExactlyOnce(inputs);
  }, 60_000);
});

test('keeps everything safe while fully offline, then delivers once the network returns', async () => {
  server = await startServer();
  await server.setChaos({ preset: 'none', dropRate: 1 });
  const store = new OutboxStore(memoryStorage());
  const processor = buildProcessor(store);
  const inputs = await makeInputs(5);

  for (const input of inputs) await processor.enqueue(input);
  await waitUntil(() => store.getSnapshot().every((r) => r.attempts > 0));
  expect(store.getSnapshot().every((r) => r.phase === 'queued' || r.phase === 'creating')).toBe(true);
  expect(await server.v1Submissions()).toHaveLength(0);

  await server.setChaos({ preset: 'none' });
  await waitUntil(() => settled(store, inputs.length));

  await expectDeliveredExactlyOnce(inputs);
}, 60_000);

// Wraps a transport so it goes silent after N calls, like a process killed mid-request.
// 'after' commits the request on the server first, so the client dies before it learns the result.
function killAfter(inner: Transport, calls: number, mode: 'before' | 'after') {
  let count = 0;
  let announce!: () => void;
  const killed = new Promise<void>((resolve) => (announce = resolve));
  const gate = <T>(run: () => Promise<T>): Promise<T> => {
    if (++count <= calls) return run();
    announce();
    return mode === 'after' && count === calls + 1 ? run().then(() => new Promise<T>(() => undefined)) : new Promise<T>(() => undefined);
  };
  const transport: Transport = {
    create: (key, body) => gate(() => inner.create(key, body)),
    get: (id) => gate(() => inner.get(id)),
    uploadPhoto: (id, photo) => gate(() => inner.uploadPhoto(id, photo)),
    finalize: (id) => gate(() => inner.finalize(id)),
  };
  return { transport, killed };
}

test('survives repeated app kills mid-request on flaky wifi without losing or duplicating anything', async () => {
  server = await startServer();
  await server.setChaos({ preset: 'flaky-wifi', latencyMs: FAST_LATENCY, seed: 3 });
  const storage = memoryStorage();
  const inputs = await makeInputs(8);

  let generations = 0;
  let finalStore!: OutboxStore;
  for (; generations < 60; generations++) {
    const store = new OutboxStore(storage);
    const { transport, killed } = killAfter(realTransport(), 4 + (generations % 5), generations % 2 ? 'after' : 'before');
    const processor = buildProcessor(store, transport);

    await processor.start();
    if (generations === 0) for (const input of inputs) await processor.enqueue(input);

    let alive = true;
    const outcome = await Promise.race([
      waitUntil(() => !alive || settled(store, inputs.length)).then(() => 'done' as const),
      killed.then(() => 'killed' as const),
    ]);
    alive = false;
    finalStore = store;
    if (outcome === 'done') break;
  }

  expect(generations).toBeGreaterThan(2);
  expect(finalStore.getSnapshot().every((r) => r.phase === 'submitted')).toBe(true);
  await expectDeliveredExactlyOnce(inputs);
}, 90_000);
