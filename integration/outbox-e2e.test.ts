import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createHttpTransport } from '../src/outbox/httpTransport';
import { OutboxProcessor } from '../src/outbox/processor';
import { OutboxStore } from '../src/outbox/store';
import { memoryStorage } from '../src/outbox/testing';
import { startServer } from './harness';
import { nodeFiles, nodePutPhoto, writePhoto } from './support';

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
  const photos = [await writePhoto(dir, 'p0', 'first photo bytes'), await writePhoto(dir, 'p1', 'second photo bytes')];

  await processor.enqueue({ id: 's1', categoryId: 'excavator', schemaVersion: 1, fields: { serial: 'SN-1' }, photos });
  await processor.requestDrain();

  expect(store.get('s1')?.phase).toBe('submitted');
  const [stored] = await server.v1Submissions();
  expect(stored.status).toBe('finalized');
  expect(stored.storedPhotos.map((p) => p.sha256).sort()).toEqual(photos.map((p) => p.sha256).sort());
});
