import type { SubmissionView } from '@shared/contract';
import { TransportError, type CreateBody, type Transport } from './transport';
import type { OutboxPhoto } from './types';

export type PutPhoto = (request: {
  url: string;
  photo: OutboxPhoto;
  signal: AbortSignal;
  // Call whenever bytes move so the stall watchdog stays quiet.
  onProgress: () => void;
}) => Promise<{ status: number; body: string; headers?: Record<string, string> }>;

export type HttpTransportOptions = {
  baseUrl: string;
  putPhoto: PutPhoto;
  fetchImpl?: typeof fetch;
  metadataTimeoutMs?: number;
  photoBaseTimeoutMs?: number;
  // Slowest link we still wait for; scales a photo's deadline with its size.
  photoMinBytesPerSec?: number;
  // Abort a photo upload that reports no progress for this long (0 disables).
  photoStallMs?: number;
};

type Parsed = { code?: string; message?: string; missing?: string[] };

function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(ms) ? Math.max(0, ms) : undefined;
}

function httpError(status: number, body: string, retryAfter?: string | null): TransportError {
  let parsed: Parsed = {};
  try {
    parsed = JSON.parse(body);
  } catch {
    // Non-JSON error bodies (proxies, captive portals) fall back to the status text.
  }
  // 404 and 409 are transient: the next attempt re-syncs with the server and recovers.
  const transient = [404, 408, 409, 429].includes(status) || status >= 500 || parsed.code === 'checksum_mismatch';
  return new TransportError(parsed.message ?? `HTTP ${status}`, transient ? 'transient' : 'permanent', {
    code: parsed.code ?? `http_${status}`,
    retryAfterMs: parseRetryAfter(retryAfter),
    missing: parsed.missing,
  });
}

async function withDeadline<T>(
  timeoutMs: number,
  stallMs: number,
  work: (signal: AbortSignal, touch: () => void) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => {
    timedOut = true;
    controller.abort();
  };
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    if (!stallMs) return;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(abort, stallMs);
  };
  const deadlineTimer = setTimeout(abort, timeoutMs);
  touch();

  // Race the abort so a work function that ignores the signal still cannot hang the queue.
  const aborted = new Promise<never>((_, reject) =>
    controller.signal.addEventListener('abort', () => reject(new Error('aborted'))),
  );
  aborted.catch(() => undefined);

  try {
    return await Promise.race([work(controller.signal, touch), aborted]);
  } catch (e) {
    if (e instanceof TransportError) throw e;
    throw new TransportError(timedOut ? 'Request timed out' : `Network error: ${String(e)}`, 'transient', {
      code: timedOut ? 'timeout' : 'network',
    });
  } finally {
    clearTimeout(deadlineTimer);
    clearTimeout(stallTimer);
  }
}

export function createHttpTransport(options: HttpTransportOptions): Transport {
  const {
    baseUrl,
    putPhoto,
    fetchImpl = fetch,
    metadataTimeoutMs = 15_000,
    photoBaseTimeoutMs = 15_000,
    photoMinBytesPerSec = 20_000,
    photoStallMs = 20_000,
  } = options;

  async function json<T>(path: string, init: RequestInit, allowNotFound = false): Promise<T | null> {
    return withDeadline(metadataTimeoutMs, 0, async (signal) => {
      const res = await fetchImpl(`${baseUrl}${path}`, { ...init, signal });
      const text = await res.text();
      if (allowNotFound && res.status === 404) return null;
      if (!res.ok) throw httpError(res.status, text, res.headers.get('retry-after'));
      return JSON.parse(text) as T;
    });
  }

  return {
    create: (key: string, body: CreateBody) =>
      json<SubmissionView>('/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': key },
        body: JSON.stringify(body),
      }) as Promise<SubmissionView>,

    get: (serverId: string) => json<SubmissionView>(`/submissions/${serverId}`, { method: 'GET' }, true),

    finalize: (serverId: string) =>
      json<SubmissionView>(`/submissions/${serverId}/finalize`, { method: 'POST' }) as Promise<SubmissionView>,

    async uploadPhoto(serverId: string, photo: OutboxPhoto) {
      const timeoutMs = photoBaseTimeoutMs + (photo.size / photoMinBytesPerSec) * 1000;
      await withDeadline(timeoutMs, photoStallMs, async (signal, touch) => {
        const res = await putPhoto({
          url: `${baseUrl}/submissions/${serverId}/photos/${photo.id}`,
          photo,
          signal,
          onProgress: touch,
        });
        if (res.status < 200 || res.status >= 300) {
          const retryAfter = res.headers?.['retry-after'] ?? res.headers?.['Retry-After'];
          throw httpError(res.status, res.body, retryAfter);
        }
      });
    },
  };
}
