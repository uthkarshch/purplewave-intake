import { createHttpTransport, type PutPhoto } from './httpTransport';
import { TransportError } from './transport';
import type { OutboxPhoto } from './types';

const photo: OutboxPhoto = { id: 'p1', uri: 'file:///p1.jpg', sha256: 'x', size: 20_000, uploaded: false, checksumFailures: 0 };

const respond = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

const never = () => new Promise<never>(() => undefined);

function transportWith(fetchImpl: typeof fetch, putPhoto: PutPhoto = async () => ({ status: 200, body: '{}' })) {
  return createHttpTransport({
    baseUrl: 'http://api',
    fetchImpl,
    putPhoto,
    metadataTimeoutMs: 1_000,
    photoBaseTimeoutMs: 1_000,
    photoMinBytesPerSec: 20_000,
    photoStallMs: 500,
  });
}

const caught = async (promise: Promise<unknown>) => promise.then(() => undefined, (e: unknown) => e as TransportError);

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('requests', () => {
  test('create sends the idempotency key and JSON body, and returns the parsed view', async () => {
    const fetchImpl = jest.fn(async () => respond(201, { id: 'srv_1' }));
    const body = { categoryId: 'excavator', schemaVersion: 1, fields: {}, photos: [] };

    const view = await transportWith(fetchImpl as unknown as typeof fetch).create('key-1', body);

    expect(view).toEqual({ id: 'srv_1' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://api/submissions');
    expect(init.headers).toMatchObject({ 'idempotency-key': 'key-1' });
    expect(init.body).toBe(JSON.stringify(body));
  });

  test('get returns null for an unknown submission', async () => {
    const t = transportWith((async () => respond(404)) as unknown as typeof fetch);
    expect(await t.get('srv_9')).toBeNull();
  });

  test('upload targets the photo URL and succeeds on 2xx', async () => {
    const putPhoto = jest.fn<ReturnType<PutPhoto>, Parameters<PutPhoto>>(async () => ({ status: 200, body: '{}' }));
    await transportWith(jest.fn() as unknown as typeof fetch, putPhoto).uploadPhoto('srv_1', photo);
    expect(putPhoto.mock.calls[0][0].url).toBe('http://api/submissions/srv_1/photos/p1');
  });
});

describe('error classification', () => {
  const classify = async (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
    (await caught(
      transportWith((async () => respond(status, body, headers)) as unknown as typeof fetch).finalize('srv_1'),
    ))!;

  test.each([500, 502, 503, 429, 408, 404, 409])('HTTP %i is transient', async (status) => {
    expect((await classify(status)).kind).toBe('transient');
  });

  test.each([400, 401, 403, 422])('HTTP %i is permanent', async (status) => {
    expect((await classify(status)).kind).toBe('permanent');
  });

  test('carries the server error code and the missing photo list', async () => {
    const err = await classify(409, { code: 'missing_photos', message: 'Photos still missing', missing: ['p2'] });
    expect(err).toMatchObject({ kind: 'transient', code: 'missing_photos', details: { missing: ['p2'] } });
  });

  test('a checksum mismatch is transient even though it is a 422', async () => {
    expect(await classify(422, { code: 'checksum_mismatch', message: 'bad' })).toMatchObject({
      kind: 'transient',
      code: 'checksum_mismatch',
    });
  });

  test('reads Retry-After in seconds', async () => {
    const err = await classify(503, {}, { 'retry-after': '7' });
    expect(err.details.retryAfterMs).toBe(7_000);
  });

  test('survives a non-JSON error page such as a captive portal', async () => {
    const err = await classify(503, '<html>login</html>');
    expect(err).toMatchObject({ kind: 'transient', code: 'http_503' });
  });

  test('a thrown fetch is a transient network error', async () => {
    const t = transportWith((async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch);
    expect(await caught(t.finalize('srv_1'))).toMatchObject({ kind: 'transient', code: 'network' });
  });
});

describe('timeouts', () => {
  test('a metadata request that never answers times out as transient', async () => {
    const t = transportWith(((_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch);

    const pending = caught(t.finalize('srv_1'));
    await jest.advanceTimersByTimeAsync(1_000);

    expect(await pending).toMatchObject({ kind: 'transient', code: 'timeout' });
  });

  test('an upload function that ignores the abort signal still cannot hang the queue', async () => {
    const t = transportWith(jest.fn() as unknown as typeof fetch, never);

    const pending = caught(t.uploadPhoto('srv_1', photo));
    await jest.advanceTimersByTimeAsync(600);

    expect(await pending).toMatchObject({ kind: 'transient', code: 'timeout' });
  });

  test('progress keeps a slow upload alive past the stall window', async () => {
    let finish!: () => void;
    const putPhoto: PutPhoto = ({ onProgress }) =>
      new Promise((resolve) => {
        const tick = setInterval(onProgress, 300);
        finish = () => {
          clearInterval(tick);
          resolve({ status: 200, body: '{}' });
        };
      });
    const pending = caught(transportWith(jest.fn() as unknown as typeof fetch, putPhoto).uploadPhoto('srv_1', photo));

    await jest.advanceTimersByTimeAsync(1_500);
    finish();

    expect(await pending).toBeUndefined();
  });

  test('the deadline scales with photo size', async () => {
    const big = { ...photo, size: 200_000 }; // 1s base + 10s at 20 KB/s
    const putPhoto: PutPhoto = ({ onProgress }) =>
      new Promise((resolve) => {
        const tick = setInterval(onProgress, 100);
        setTimeout(() => {
          clearInterval(tick);
          resolve({ status: 200, body: '{}' });
        }, 9_000);
      });
    const pending = caught(transportWith(jest.fn() as unknown as typeof fetch, putPhoto).uploadPhoto('srv_1', big));

    await jest.advanceTimersByTimeAsync(9_000);

    expect(await pending).toBeUndefined();
  });
});
