import { createHash, randomUUID } from 'node:crypto';
import express, { Router } from 'express';

import type { ApiError, ApiErrorCode, CreateSubmissionBody, SubmissionView } from '../shared/contract';

type StoredSubmission = {
  view: SubmissionView;
  photos: Map<string, Buffer>;
};

export type DebugSubmission = SubmissionView & { storedPhotos: { id: string; sha256: string }[] };

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

const fail = (res: express.Response, status: number, code: ApiErrorCode, message: string, missing?: string[]) =>
  res.status(status).json({ code, message, ...(missing ? { missing } : {}) } satisfies ApiError);

function isValidBody(body: unknown): body is CreateSubmissionBody {
  const b = body as Partial<CreateSubmissionBody> | null;
  return (
    !!b &&
    typeof b.categoryId === 'string' &&
    typeof b.schemaVersion === 'number' &&
    typeof b.fields === 'object' &&
    b.fields !== null &&
    Array.isArray(b.photos) &&
    b.photos.every((p) => typeof p.id === 'string' && typeof p.sha256 === 'string' && typeof p.size === 'number')
  );
}

// The check-and-commit steps below contain no awaits, so Node's single thread makes them atomic.
export function createSubmissionRouter() {
  const router = Router();
  const byId = new Map<string, StoredSubmission>();
  const byKey = new Map<string, { bodyHash: string; id: string }>();

  router.post('/', express.json(), (req, res) => {
    const key = req.header('idempotency-key');
    if (!key) return fail(res, 400, 'missing_idempotency_key', 'Idempotency-Key header is required');
    if (!isValidBody(req.body)) return fail(res, 400, 'invalid_body', 'Malformed submission body');

    const bodyHash = sha256(Buffer.from(JSON.stringify(req.body)));
    const existing = byKey.get(key);
    if (existing) {
      if (existing.bodyHash !== bodyHash) {
        return fail(res, 422, 'idempotency_key_reuse', 'Idempotency-Key was already used with a different body');
      }
      return void res.status(201).json(byId.get(existing.id)!.view);
    }

    const view: SubmissionView = {
      id: `sub_${randomUUID()}`,
      status: 'created',
      categoryId: req.body.categoryId,
      schemaVersion: req.body.schemaVersion,
      fields: req.body.fields,
      photos: req.body.photos,
      receivedPhotoIds: [],
    };
    byId.set(view.id, { view, photos: new Map() });
    byKey.set(key, { bodyHash, id: view.id });
    res.status(201).json(view);
  });

  router.put('/:id/photos/:photoId', express.raw({ type: () => true, limit: '25mb' }), (req, res) => {
    const stored = byId.get(req.params.id);
    if (!stored) return void res.sendStatus(404);

    const entry = stored.view.photos.find((p) => p.id === req.params.photoId);
    if (!entry) return fail(res, 422, 'unknown_photo', 'Photo is not in the manifest');

    const bytes: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (bytes.length !== entry.size || sha256(bytes) !== entry.sha256) {
      return fail(res, 422, 'checksum_mismatch', 'Photo bytes do not match the manifest');
    }

    if (!stored.photos.has(entry.id)) {
      stored.photos.set(entry.id, bytes);
      stored.view.receivedPhotoIds.push(entry.id);
    }
    res.status(200).json(stored.view);
  });

  router.post('/:id/finalize', (req, res) => {
    const stored = byId.get(req.params.id);
    if (!stored) return void res.sendStatus(404);

    const missing = stored.view.photos.map((p) => p.id).filter((id) => !stored.photos.has(id));
    if (missing.length) return fail(res, 409, 'missing_photos', 'Photos still missing', missing);

    stored.view.status = 'finalized';
    res.status(200).json(stored.view);
  });

  router.get('/:id', (req, res) => {
    const stored = byId.get(req.params.id);
    if (!stored) return void res.sendStatus(404);
    res.json(stored.view);
  });

  const debugList = (): DebugSubmission[] =>
    [...byId.values()].map(({ view, photos }) => ({
      ...view,
      storedPhotos: [...photos].map(([id, bytes]) => ({ id, sha256: sha256(bytes) })),
    }));

  return { router, debugList };
}
