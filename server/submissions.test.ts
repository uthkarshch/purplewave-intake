import { createHash } from 'node:crypto';

import type { ApiError, CreateSubmissionBody, SubmissionView } from '../shared/contract';
import { startServer } from '../integration/harness';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

const photoA = Buffer.from('photo-a-bytes');
const photoB = Buffer.from('photo-b-bytes');

const body = (overrides: Partial<CreateSubmissionBody> = {}): CreateSubmissionBody => ({
  categoryId: 'excavator',
  schemaVersion: 1,
  fields: { serial: 'SN-1' },
  photos: [
    { id: 'p1', sha256: sha256(photoA), size: photoA.length },
    { id: 'p2', sha256: sha256(photoB), size: photoB.length },
  ],
  ...overrides,
});

let server: Awaited<ReturnType<typeof startServer>>;
beforeEach(async () => {
  server = await startServer();
});
afterEach(() => server.close());

const create = (key: string | undefined, payload: CreateSubmissionBody = body()) =>
  fetch(`${server.baseUrl}/submissions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(payload),
  });

const upload = (id: string, photoId: string, bytes: Buffer) =>
  fetch(`${server.baseUrl}/submissions/${id}/photos/${photoId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
  });

const finalize = (id: string) => fetch(`${server.baseUrl}/submissions/${id}/finalize`, { method: 'POST' });

describe('POST /submissions', () => {
  test('creates a submission and replays the original response for the same key', async () => {
    const first = await create('k1');
    const replay = await create('k1');

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(((await replay.json()) as SubmissionView).id).toBe(((await first.json()) as SubmissionView).id);
    expect(await server.v1Submissions()).toHaveLength(1);
  });

  test('rejects reusing a key with a different body', async () => {
    await create('k1');
    const res = await create('k1', body({ fields: { serial: 'SN-2' } }));

    expect(res.status).toBe(422);
    expect(((await res.json()) as ApiError).code).toBe('idempotency_key_reuse');
  });

  test('creates once when the same key arrives concurrently', async () => {
    await Promise.all(Array.from({ length: 5 }, () => create('k1')));
    expect(await server.v1Submissions()).toHaveLength(1);
  });

  test('requires an Idempotency-Key', async () => {
    const res = await create(undefined);
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).code).toBe('missing_idempotency_key');
  });

  test('rejects a malformed body', async () => {
    const res = await create('k1', { categoryId: 'excavator' } as CreateSubmissionBody);
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiError).code).toBe('invalid_body');
  });
});

describe('PUT /submissions/:id/photos/:photoId', () => {
  const createdId = async () => ((await (await create('k1')).json()) as SubmissionView).id;

  test('stores the photo and treats a repeat upload as a no-op', async () => {
    const id = await createdId();

    expect((await upload(id, 'p1', photoA)).status).toBe(200);
    expect((await upload(id, 'p1', photoA)).status).toBe(200);

    const view = (await (await fetch(`${server.baseUrl}/submissions/${id}`)).json()) as SubmissionView;
    expect(view.receivedPhotoIds).toEqual(['p1']);
  });

  test('rejects bytes that do not match the manifest checksum', async () => {
    const id = await createdId();
    const res = await upload(id, 'p1', Buffer.from('corrupted'));

    expect(res.status).toBe(422);
    expect(((await res.json()) as ApiError).code).toBe('checksum_mismatch');
    const view = (await (await fetch(`${server.baseUrl}/submissions/${id}`)).json()) as SubmissionView;
    expect(view.receivedPhotoIds).toEqual([]);
  });

  test('rejects a photo that is not in the manifest', async () => {
    const id = await createdId();
    const res = await upload(id, 'nope', photoA);

    expect(res.status).toBe(422);
    expect(((await res.json()) as ApiError).code).toBe('unknown_photo');
  });

  test('404s for an unknown submission', async () => {
    expect((await upload('missing', 'p1', photoA)).status).toBe(404);
  });
});

describe('POST /submissions/:id/finalize', () => {
  test('409s with the missing photo ids until every photo has landed', async () => {
    const { id } = (await (await create('k1')).json()) as SubmissionView;
    await upload(id, 'p1', photoA);

    const early = await finalize(id);
    expect(early.status).toBe(409);
    expect(await early.json()).toMatchObject({ code: 'missing_photos', missing: ['p2'] });

    await upload(id, 'p2', photoB);
    const done = await finalize(id);
    expect(done.status).toBe(200);
    expect(((await done.json()) as SubmissionView).status).toBe('finalized');
  });

  test('is idempotent, and late identical photo uploads still succeed', async () => {
    const { id } = (await (await create('k1')).json()) as SubmissionView;
    await upload(id, 'p1', photoA);
    await upload(id, 'p2', photoB);

    expect((await finalize(id)).status).toBe(200);
    expect((await finalize(id)).status).toBe(200);
    expect((await upload(id, 'p1', photoA)).status).toBe(200);
  });

  test('404s for an unknown submission', async () => {
    expect((await finalize('missing')).status).toBe(404);
  });
});

describe('GET /submissions/:id', () => {
  test('404s for an unknown submission', async () => {
    expect((await fetch(`${server.baseUrl}/submissions/missing`)).status).toBe(404);
  });
});
