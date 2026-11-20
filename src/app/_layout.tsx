import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { startOutbox } from '@/features/outbox/runtime';

export default function RootLayout() {
  useEffect(() => {
    void startOutbox();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'New appraisal' }} />
      <Stack.Screen name="submissions" options={{ title: 'Submissions' }} />
    </Stack>
  );
}
