import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { preparePhotos } from './photos/preparePhotos';
import type { AppraisalDeps } from './useAppraisalForm';

// Everything but enqueue, which comes from the outbox provider.
export const nativeDeps: Omit<AppraisalDeps, 'enqueue'> = {
  preparePhotos,
  newId: randomUUID,
  pickPhotos: async (source, multiple) => {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: multiple, quality: 1 });
    return result.canceled ? [] : result.assets.map((a) => a.uri);
  },
};
