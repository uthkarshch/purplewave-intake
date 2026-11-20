import { MAX_BACKOFF_MS } from './backoff';
import { OutboxProcessor } from './processor';
import { OutboxStore } from './store';
import { createFakeBackend, memoryFiles, memoryStorage, sampleInput } from './testing';
import { TransportError } from './transport';

const photoUris = (id: string) => ['p1', 'p2'].map((p) => `file:///${id}/${p}.jpg`);

function setup(existingFiles: string[] = photoUris('s1').concat(photoUris('s2'))) {
  const storage = memoryStorage();
  const backend = createFakeBackend();
  const files = memoryFiles(existingFiles);
  const build = () => {
    const store = new OutboxStore(storage);
    const processor = new OutboxProcessor({ store, transport: backend.transport, files, random: () => 0.5 });
    return { store, processor };
  };
  return { storage, backend, files, build, ...build() };
}

const phaseOf = (store: OutboxStore, id: string) => store.get(id)?.phase;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('delivers a submission: create, upload each photo, finalize, then clean up local files', async () => {
  const { processor, store, backend, files } = setup();

  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();

  expect(phaseOf(store, 's1')).toBe('submitted');
  expect(backend.calls).toEqual(['create', 'upload:s1-p1', 'upload:s1-p2', 'finalize']);
  expect(files.present.has('file:///s1/p1.jpg')).toBe(false);
});

test('a transient failure backs off, then resumes without re-creating or re-sending finished photos', async () => {
  const { processor, store, backend } = setup();
  backend.failNext('uploadPhoto', 'before');
  backend.calls.length = 0;

  await processor.enqueue(sampleInput('s1', ['p1']));
  await processor.requestDrain();
  expect(phaseOf(store, 's1')).toBe('queued');
  expect(store.get('s1')).toMatchObject({ attempts: 1, lastError: 'network down' });

  await jest.advanceTimersByTimeAsync(1_000);
  await processor.requestDrain();

  expect(phaseOf(store, 's1')).toBe('submitted');
  expect(backend.calls.filter((c) => c === 'create')).toHaveLength(1);
});

test('after a lost ack on an upload it asks the server and does not resend that photo', async () => {
  const { processor, store, backend } = setup();
  backend.failNext('uploadPhoto', 'after');

  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();
  await jest.advanceTimersByTimeAsync(1_000);
  await processor.requestDrain();

  expect(phaseOf(store, 's1')).toBe('submitted');
  expect(backend.calls).toEqual(['create', 'upload:s1-p1', 'get', 'upload:s1-p2', 'finalize']);
});

test('a lost ack on create replays the same idempotency key and yields one server submission', async () => {
  const { processor, store, backend } = setup();
  backend.failNext('create', 'after');

  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();
  await jest.advanceTimersByTimeAsync(1_000);
  await processor.requestDrain();

  expect(phaseOf(store, 's1')).toBe('submitted');
  expect(backend.submissions.size).toBe(1);
});

test('resumes after a kill mid-upload without creating again', async () => {
  const { processor, store, storage, backend, build } = setup();
  backend.failNext('uploadPhoto', 'before');
  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();
  await store.update('s1', { phase: 'uploading' });

  const restarted = build();
  await restarted.processor.start();
  await jest.advanceTimersByTimeAsync(1_000);
  await restarted.processor.requestDrain();

  expect(JSON.parse(storage.data.get('outbox:sub:s1')!).phase).toBe('submitted');
  expect(backend.calls.filter((c) => c === 'create')).toHaveLength(1);
});

test('a permanent error parks that submission and does not block the next one', async () => {
  const { processor, store, backend } = setup();
  backend.failNext('create', 'before', new TransportError('bad body', 'permanent', { code: 'invalid_body' }));

  await processor.enqueue(sampleInput('s1'));
  await processor.enqueue(sampleInput('s2'));
  await processor.requestDrain();

  expect(store.get('s1')).toMatchObject({ phase: 'needs-attention', attentionReason: 'invalid_body' });
  expect(phaseOf(store, 's2')).toBe('submitted');
});

test('overlapping drain requests run one loop, not parallel workers', async () => {
  const { processor, backend } = setup();

  await processor.enqueue(sampleInput('s1'));
  await Promise.all(Array.from({ length: 5 }, () => processor.requestDrain()));

  expect(backend.calls.filter((c) => c === 'create')).toHaveLength(1);
});

test('enqueueing the same id twice creates one record and one server submission', async () => {
  const { processor, store, backend } = setup();

  await processor.enqueue(sampleInput('s1'));
  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();

  expect(store.getSnapshot()).toHaveLength(1);
  expect(backend.submissions.size).toBe(1);
});

test('flags a photo the server keeps rejecting after three checksum failures', async () => {
  const { processor, store, backend } = setup();
  const mismatch = () => new TransportError('bad bytes', 'transient', { code: 'checksum_mismatch' });
  [1, 2, 3].forEach(() => backend.failNext('uploadPhoto', 'before', mismatch()));

  await processor.enqueue(sampleInput('s1'));
  for (let i = 0; i < 3; i++) {
    await processor.requestDrain();
    await jest.advanceTimersByTimeAsync(MAX_BACKOFF_MS);
  }
  await processor.requestDrain();

  expect(store.get('s1')).toMatchObject({ phase: 'needs-attention', attentionReason: 'photo_rejected:s1-p1' });
});

test('a missing local photo needs attention, and a manual retry works once it exists again', async () => {
  const { processor, store, files } = setup([]);

  await processor.enqueue(sampleInput('s1', ['p1']));
  await processor.requestDrain();
  expect(store.get('s1')).toMatchObject({ phase: 'needs-attention', attentionReason: 'photo_missing:s1-p1' });

  files.present.add('file:///s1/p1.jpg');
  await processor.retry('s1');

  expect(phaseOf(store, 's1')).toBe('submitted');
});

test('does not wait on a retry time far in the future, as after a clock change', async () => {
  const { processor, store } = setup();
  await store.add({
    id: 's1',
    categoryId: 'excavator',
    schemaVersion: 1,
    fields: {},
    photos: [],
    createdAt: 1,
    phase: 'queued',
    attempts: 0,
    nextAttemptAt: Date.now() + 10 * 24 * 60 * 60_000,
  });

  await processor.requestDrain();
  expect(phaseOf(store, 's1')).toBe('submitted');
});

test('recovers when the server reports a photo missing at finalize', async () => {
  const { processor, store, backend } = setup();
  backend.failNext(
    'finalize',
    'before',
    new TransportError('missing', 'transient', { code: 'missing_photos', missing: ['s1-p2'] }),
  );

  await processor.enqueue(sampleInput('s1'));
  await processor.requestDrain();
  const stored = backend.submissions.get('srv_1')!;
  stored.photos.delete('s1-p2');
  stored.view.receivedPhotoIds = ['s1-p1'];

  await jest.advanceTimersByTimeAsync(1_000);
  await processor.requestDrain();

  expect(phaseOf(store, 's1')).toBe('submitted');
  expect(stored.photos.has('s1-p2')).toBe(true);
});

test('recreates the submission when the server no longer knows it', async () => {
  const { processor, store, backend } = setup();
  backend.failNext('uploadPhoto', 'before');

  await processor.enqueue(sampleInput('s1', ['p1']));
  await processor.requestDrain();
  backend.forget('srv_1');

  await jest.advanceTimersByTimeAsync(1_000);
  await processor.requestDrain();

  expect(store.get('s1')).toMatchObject({ phase: 'submitted', serverId: 'srv_2' });
});
