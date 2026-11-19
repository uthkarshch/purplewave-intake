import { computeBackoff, MAX_BACKOFF_MS } from './backoff';
import type { OutboxStore } from './store';
import { TransportError, type PhotoFiles, type Transport } from './transport';
import type { EnqueueInput, OutboxPhoto, OutboxRecord } from './types';

const MAX_CHECKSUM_FAILURES = 3;

type Deps = {
  store: OutboxStore;
  transport: Transport;
  files: PhotoFiles;
  now?: () => number;
  random?: () => number;
  backoff?: (attempts: number, retryAfterMs?: number) => number;
};

export class OutboxProcessor {
  private store: OutboxStore;
  private transport: Transport;
  private files: PhotoFiles;
  private now: () => number;
  private backoff: (attempts: number, retryAfterMs?: number) => number;

  private active = false;
  private again = false;
  private done: Promise<void> = Promise.resolve();
  private wakeTimer?: ReturnType<typeof setTimeout>;

  constructor(deps: Deps) {
    this.store = deps.store;
    this.transport = deps.transport;
    this.files = deps.files;
    this.now = deps.now ?? Date.now;
    const random = deps.random ?? Math.random;
    this.backoff = deps.backoff ?? ((attempts, retryAfterMs) => computeBackoff(attempts, random, retryAfterMs));
  }

  // Resolves once persisted state is loaded; the first drain runs in the background.
  async start(): Promise<void> {
    await this.store.load();
    await this.store.resetInFlight();
    void this.requestDrain();
  }

  async enqueue(input: EnqueueInput): Promise<OutboxRecord> {
    const record = await this.store.add({
      ...input,
      photos: input.photos.map((p) => ({ ...p, uploaded: false, checksumFailures: 0 })),
      createdAt: this.now(),
      phase: 'queued',
      attempts: 0,
      nextAttemptAt: 0,
    });
    void this.requestDrain();
    return record;
  }

  async retry(id: string): Promise<void> {
    await this.store.update(id, {
      phase: 'queued',
      attempts: 0,
      nextAttemptAt: 0,
      attentionReason: undefined,
      lastError: undefined,
    });
    await this.requestDrain();
  }

  // Triggers coalesce: a request that arrives mid-run makes the loop go round once more.
  requestDrain(): Promise<void> {
    if (this.active) {
      this.again = true;
      return this.done;
    }
    this.active = true;
    this.done = this.loop();
    return this.done;
  }

  private async loop(): Promise<void> {
    try {
      do {
        this.again = false;
        await this.pass();
      } while (this.again);
    } finally {
      this.active = false;
      this.armWakeTimer();
    }
  }

  private async pass(): Promise<void> {
    for (let next = this.nextDue(); next; next = this.nextDue()) {
      await this.process(next);
    }
  }

  // A retry time further out than the backoff cap can only come from a clock change; don't wait on it.
  private dueAt(record: OutboxRecord): number {
    const now = this.now();
    return record.nextAttemptAt - now > MAX_BACKOFF_MS ? now : record.nextAttemptAt;
  }

  private nextDue(): OutboxRecord | undefined {
    return this.store.getSnapshot().find((r) => r.phase === 'queued' && this.dueAt(r) <= this.now());
  }

  private armWakeTimer() {
    clearTimeout(this.wakeTimer);
    const waiting = this.store.getSnapshot().filter((r) => r.phase === 'queued');
    if (!waiting.length) return;
    const delay = Math.max(0, Math.min(...waiting.map((r) => this.dueAt(r))) - this.now());
    this.wakeTimer = setTimeout(() => void this.requestDrain(), delay);
  }

  private async process(initial: OutboxRecord): Promise<void> {
    const { id } = initial;
    try {
      let record = initial;
      if (record.serverId && record.attempts > 0) record = await this.syncFromServer(record);

      if (!record.serverId) {
        record = await this.store.update(id, { phase: 'creating' });
        const view = await this.transport.create(id, {
          categoryId: record.categoryId,
          schemaVersion: record.schemaVersion,
          fields: record.fields,
          photos: record.photos.map(({ id: photoId, sha256, size }) => ({ id: photoId, sha256, size })),
        });
        record = await this.store.update(id, {
          serverId: view.id,
          attempts: 0,
          photos: markUploaded(record.photos, view.receivedPhotoIds),
        });
      }

      record = await this.uploadPhotos(record);
      if (record.phase === 'needs-attention') return;

      await this.store.update(id, { phase: 'finalizing' });
      try {
        await this.transport.finalize(record.serverId!);
      } catch (e) {
        if (e instanceof TransportError && e.code === 'missing_photos') {
          await this.store.update(id, { photos: unmarkUploaded(record.photos, e.details.missing ?? []) });
        }
        throw e;
      }
      await this.store.update(id, { phase: 'submitted', attempts: 0, lastError: undefined });
      await this.removePhotos(record.photos);
    } catch (e) {
      // If persisting the failure itself fails, the in-memory record is already updated; nothing more to do.
      await this.recordFailure(id, e).catch(() => undefined);
    }
  }

  // After a failure the outcome of the last request is unknown, so ask the server what it has.
  private async syncFromServer(record: OutboxRecord): Promise<OutboxRecord> {
    const view = await this.transport.get(record.serverId!);
    if (!view) {
      return this.store.update(record.id, {
        serverId: undefined,
        photos: record.photos.map((p) => ({ ...p, uploaded: false })),
      });
    }
    return this.store.update(record.id, { photos: markUploaded(unmarkAll(record.photos), view.receivedPhotoIds) });
  }

  private async uploadPhotos(record: OutboxRecord): Promise<OutboxRecord> {
    let current = record;
    for (const photo of record.photos) {
      if (current.photos.find((p) => p.id === photo.id)?.uploaded) continue;

      if (!(await this.files.exists(photo.uri))) {
        return this.store.update(record.id, { phase: 'needs-attention', attentionReason: `photo_missing:${photo.id}` });
      }

      await this.store.update(record.id, { phase: 'uploading' });
      try {
        await this.transport.uploadPhoto(record.serverId!, photo);
      } catch (e) {
        if (e instanceof TransportError && e.code === 'checksum_mismatch') {
          const failures = photo.checksumFailures + 1;
          const photos = current.photos.map((p) => (p.id === photo.id ? { ...p, checksumFailures: failures } : p));
          current = await this.store.update(record.id, { photos });
          if (failures >= MAX_CHECKSUM_FAILURES) {
            return this.store.update(record.id, { phase: 'needs-attention', attentionReason: `photo_rejected:${photo.id}` });
          }
        }
        throw e;
      }
      current = await this.store.update(record.id, {
        attempts: 0,
        photos: current.photos.map((p) => (p.id === photo.id ? { ...p, uploaded: true } : p)),
      });
    }
    return current;
  }

  private async recordFailure(id: string, error: unknown): Promise<void> {
    const err = error instanceof TransportError ? error : new TransportError(String(error), 'transient');
    if (err.kind === 'permanent') {
      await this.store.update(id, {
        phase: 'needs-attention',
        attentionReason: err.code ?? err.message,
        lastError: err.message,
      });
      return;
    }
    const attempts = (this.store.get(id)?.attempts ?? 0) + 1;
    await this.store.update(id, {
      phase: 'queued',
      attempts,
      nextAttemptAt: this.now() + this.backoff(attempts, err.details.retryAfterMs),
      lastError: err.message,
    });
  }

  private async removePhotos(photos: OutboxPhoto[]) {
    await Promise.all(photos.map((p) => this.files.remove(p.uri).catch(() => undefined)));
  }
}

const markUploaded = (photos: OutboxPhoto[], ids: string[]) =>
  photos.map((p) => (ids.includes(p.id) ? { ...p, uploaded: true } : p));

const unmarkUploaded = (photos: OutboxPhoto[], ids: string[]) =>
  photos.map((p) => (ids.includes(p.id) ? { ...p, uploaded: false } : p));

const unmarkAll = (photos: OutboxPhoto[]) => photos.map((p) => ({ ...p, uploaded: false }));
