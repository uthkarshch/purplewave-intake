import { createHash } from 'node:crypto';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PutPhoto } from '../src/features/outbox/httpTransport';
import type { PhotoFiles } from '../src/features/outbox/transport';

// Node stand-ins for the Expo file APIs: a photo "uri" is just a path on disk.
export const nodeFiles: PhotoFiles = {
  exists: (uri) =>
    access(uri).then(
      () => true,
      () => false,
    ),
  remove: (uri) => rm(uri, { force: true }),
};

export const nodePutPhoto: PutPhoto = async ({ url, photo, signal, onProgress }) => {
  const bytes = await readFile(photo.uri);
  onProgress();
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: new Uint8Array(bytes),
    signal,
  });
  return { status: res.status, body: await res.text(), headers: Object.fromEntries(res.headers) };
};

// A submission that passes excavator v1 validation; photo ids must be its required shot keys.
export const excavatorFields = (serial: string) => ({
  make: 'CAT',
  model: '320',
  year: 2018,
  serial,
  hours: 4200,
  undercarriage: 'good',
});
export const EXCAVATOR_PHOTO_IDS = ['front', 'hour-meter'] as const;

export async function writePhoto(dir: string, id: string, content: string, fileName = id) {
  const uri = join(dir, `${fileName}.jpg`);
  const bytes = Buffer.from(content);
  await writeFile(uri, bytes);
  return { id, uri, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
}
