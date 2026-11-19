import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createHttpTransport } from '../src/outbox/httpTransport';
import { OutboxProcessor } from '../src/outbox/processor';
import { OutboxStore } from '../src/outbox/store';
import { memoryStorage } from '../src/outbox/testing';
import { startServer } from './harness';
import { excavatorFields, nodeFiles, nodePutPhoto, writePhoto } from './support';

let server: Awaited<ReturnType<typeof startServer>>;
let dir: string;

beforeEach(async () => {
  server = await startServer();
  dir = await mkdtemp(join(tmpdir(), 'pw-outbox-'));
});

afterEach(async () => {
  await server.close();
  await rm(dir, { recursive: true, force: true });
});

function newProcessor() {
  const store = new OutboxStore(memoryStorage());
  const transport = createHttpTransport({ baseUrl: server.baseUrl, putPhoto: nodePutPhoto });
  return { store, processor: new OutboxProcessor({ store, transport, files: nodeFiles }) };
}

test('delivers a submission over real HTTP: server ends up finalized with byte-identical photos', async () => {
  const { processor, store } = newProcessor();
  const photos = [await writePhoto(dir, 'front', 'first photo bytes'), await writePhoto(dir, 'hour-meter', 'second photo bytes')];

  await processor.enqueue({ id: 's1', categoryId: 'excavator', schemaVersion: 1, fields: excavatorFields('SN-1'), photos });
  await processor.requestDrain();

  expect(store.get('s1')?.phase).toBe('submitted');
  const [stored] = await server.v1Submissions();
  expect(stored.status).toBe('finalized');
  expect(stored.storedPhotos.map((p) => p.sha256).sort()).toEqual(photos.map((p) => p.sha256).sort());
});

test('a second equipment category goes through the same pipeline unchanged', async () => {
  const { processor, store } = newProcessor();
  const photos = await Promise.all(
    ['front', 'hour-meter', 'pto-shaft'].map((id) => writePhoto(dir, id, `${id} bytes`)),
  );

  await processor.enqueue({
    id: 't1',
    categoryId: 'tractor',
    schemaVersion: 1,
    fields: { make: 'JD', model: '8R', year: 2020, serial: 'T1', hours: 900, hitchType: 'both' },
    photos,
  });
  await processor.requestDrain();

  expect(store.get('t1')?.phase).toBe('submitted');
  expect((await server.v1Submissions())[0]).toMatchObject({ categoryId: 'tractor', status: 'finalized' });
});

test('a submission the server rejects as invalid is parked with the reason and not retried', async () => {
  const { processor, store } = newProcessor();
  const photos = [await writePhoto(dir, 'front', 'only the front')];

  await processor.enqueue({ id: 's1', categoryId: 'excavator', schemaVersion: 1, fields: excavatorFields('SN-1'), photos });
  await processor.requestDrain();

  expect(store.get('s1')).toMatchObject({ phase: 'needs-attention', attentionReason: 'validation_failed' });
  expect(store.get('s1')?.lastError).toContain('Hour meter photo is required');
  expect(await server.v1Submissions()).toHaveLength(0);
});
