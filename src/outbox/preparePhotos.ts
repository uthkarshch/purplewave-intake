import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { EnqueueInput } from './types';

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.7;

export class InsufficientStorageError extends Error {
  constructor() {
    super('Not enough free storage to queue these photos');
    this.name = 'InsufficientStorageError';
  }
}

// Runs at capture time so storage problems surface while the dealer is still at the machine.
// Photos are shrunk, then moved out of the OS-purgeable cache into the app's document directory.
export async function preparePhotos(
  submissionId: string,
  sources: { id: string; uri: string }[],
): Promise<EnqueueInput['photos']> {
  const dir = new Directory(Paths.document, 'outbox', submissionId);
  dir.create({ intermediates: true, idempotent: true });

  const prepared: EnqueueInput['photos'] = [];
  for (const { id, uri: sourceUri } of sources) {
    const image = await ImageManipulator.manipulate(sourceUri, { maxWidth: MAX_EDGE_PX, maxHeight: MAX_EDGE_PX }).renderAsync();
    const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

    const compressed = new File(saved.uri);
    if (compressed.size * 2 > Paths.availableDiskSpace) throw new InsufficientStorageError();

    const destination = new File(dir, `${id}.jpg`);
    if (destination.exists) destination.delete();
    await compressed.move(destination);

    prepared.push({ id, uri: destination.uri, sha256: await destination.digest('SHA-256'), size: destination.size });
  }
  return prepared;
}
