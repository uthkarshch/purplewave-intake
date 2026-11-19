import { createHash } from 'node:crypto';

import type { SubmissionView } from '../../shared/contract';
import type { KeyValueStorage } from './store';
import { TransportError, type CreateBody, type PhotoFiles, type Transport } from './transport';
import type { EnqueueInput, OutboxPhoto } from './types';

export function memoryStorage(data = new Map<string, string>()): KeyValueStorage & { data: Map<string, string> } {
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    getAllKeys: async () => [...data.keys()],
  };
}

export function memoryFiles(existing: string[] = []) {
  const present = new Set(existing);
  return {
    present,
    exists: async (uri: string) => present.has(uri),
    remove: async (uri: string) => void present.delete(uri),
  } satisfies PhotoFiles & { present: Set<string> };
}

type Op = 'create' | 'get' | 'uploadPhoto' | 'finalize';
type Fault = { op: Op; when: 'before' | 'after'; error: TransportError };

// In-memory stand-in for the server: scripted one-shot faults, and 'after' faults model a lost ack.
export function createFakeBackend() {
  const submissions = new Map<string, { view: SubmissionView; photos: Set<string> }>();
  const keys = new Map<string, string>();
  const faults: Fault[] = [];
  const calls: string[] = [];
  let nextId = 1;

  const fault = (op: Op, when: Fault['when']) => {
    const index = faults.findIndex((f) => f.op === op && f.when === when);
    if (index >= 0) throw faults.splice(index, 1)[0].error;
  };

  const transport: Transport = {
    async create(key: string, body: CreateBody) {
      calls.push('create');
      fault('create', 'before');
      let id = keys.get(key);
      if (!id) {
        id = `srv_${nextId++}`;
        keys.set(key, id);
        submissions.set(id, {
          view: { id, status: 'created', ...body, receivedPhotoIds: [] },
          photos: new Set(),
        });
      }
      fault('create', 'after');
      return submissions.get(id)!.view;
    },
    async get(serverId: string) {
      calls.push('get');
      fault('get', 'before');
      return submissions.get(serverId)?.view ?? null;
    },
    async uploadPhoto(serverId: string, photo: OutboxPhoto) {
      calls.push(`upload:${photo.id}`);
      fault('uploadPhoto', 'before');
      const stored = submissions.get(serverId)!;
      stored.photos.add(photo.id);
      stored.view.receivedPhotoIds = [...stored.photos];
      fault('uploadPhoto', 'after');
    },
    async finalize(serverId: string) {
      calls.push('finalize');
      fault('finalize', 'before');
      const stored = submissions.get(serverId)!;
      const missing = stored.view.photos.map((p) => p.id).filter((id) => !stored.photos.has(id));
      if (missing.length) throw new TransportError('missing photos', 'transient', { code: 'missing_photos', missing });
      stored.view.status = 'finalized';
      fault('finalize', 'after');
      return stored.view;
    },
  };

  return {
    transport,
    submissions,
    calls,
    failNext(op: Op, when: Fault['when'], error = new TransportError('network down', 'transient')) {
      faults.push({ op, when, error });
    },
    forget(serverId: string) {
      submissions.delete(serverId);
      for (const [key, id] of keys) if (id === serverId) keys.delete(key);
    },
  };
}

export const sha = (text: string) => createHash('sha256').update(text).digest('hex');

export function sampleInput(id: string, photoIds: string[] = ['p1', 'p2']): EnqueueInput {
  return {
    id,
    categoryId: 'excavator',
    schemaVersion: 1,
    fields: { serial: id },
    photos: photoIds.map((photoId) => ({ id: `${id}-${photoId}`, uri: `file:///${id}/${photoId}.jpg`, sha256: sha(photoId), size: 10 })),
  };
}
