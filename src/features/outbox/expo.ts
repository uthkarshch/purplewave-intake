import { AppState } from 'react-native';
import { File, UploadType } from 'expo-file-system';

import type { PutPhoto } from './httpTransport';
import type { PhotoFiles } from './transport';

// Foreground session: Expo Go cannot continue iOS background URL sessions after suspension anyway,
// and the outbox resumes by itself on the next foreground.
export const expoPutPhoto: PutPhoto = async ({ url, photo, signal, onProgress }) => {
  const task = new File(photo.uri).createUploadTask(url, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: { 'content-type': 'application/octet-stream' },
    sessionType: 'foreground',
    signal,
    onProgress,
  });
  const res = await task.uploadAsync();
  return { status: res.status, body: res.body, headers: res.headers };
};

export const expoFiles: PhotoFiles = {
  exists: async (uri) => new File(uri).exists,
  remove: async (uri) => new File(uri).delete(),
};

export const foregroundEvents = (cb: () => void) => {
  const sub = AppState.addEventListener('change', (state) => state === 'active' && cb());
  return () => sub.remove();
};
