import { render, screen } from '@testing-library/react-native';

import type { OutboxRecord } from '@/features/outbox/types';
import { PendingBanner } from './pending-banner';

const mockRecords: { current: OutboxRecord[] } = { current: [] };

jest.mock('@/features/outbox/runtime', () => ({ useOutboxRecords: () => mockRecords.current }));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: unknown }) => children }));

const withPhase = (phase: OutboxRecord['phase']) => ({ id: phase, phase }) as OutboxRecord;

test('renders nothing when everything has been submitted', async () => {
  mockRecords.current = [withPhase('submitted')];
  await render(<PendingBanner />);
  expect(screen.toJSON()).toBeNull();
});

test('counts waiting and needs-attention submissions separately', async () => {
  mockRecords.current = [withPhase('queued'), withPhase('uploading'), withPhase('needs-attention'), withPhase('submitted')];
  await render(<PendingBanner />);
  expect(screen.getByText('2 waiting to upload · 1 need attention')).toBeTruthy();
});
