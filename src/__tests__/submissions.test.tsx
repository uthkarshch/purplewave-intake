import { fireEvent, render, screen } from '@testing-library/react-native';

import type { OutboxRecord } from '@/outbox/types';
import Submissions from '@/app/submissions';

const mockRecords: { current: OutboxRecord[] } = { current: [] };
const mockRetry = jest.fn();

jest.mock('@/outbox/runtime', () => ({
  outbox: { retry: (id: string) => mockRetry(id) },
  useOutboxRecords: () => mockRecords.current,
}));

const record = (id: string, overrides: Partial<OutboxRecord> = {}): OutboxRecord => ({
  id,
  categoryId: 'excavator',
  schemaVersion: 1,
  fields: { serial: `SN-${id}` },
  photos: [
    { id: 'p0', uri: 'a', sha256: 'x', size: 1, uploaded: true, checksumFailures: 0 },
    { id: 'p1', uri: 'b', sha256: 'y', size: 1, uploaded: false, checksumFailures: 0 },
  ],
  createdAt: 1,
  phase: 'queued',
  attempts: 0,
  nextAttemptAt: 0,
  ...overrides,
});

beforeEach(() => {
  mockRetry.mockClear();
  mockRecords.current = [];
});

test('shows an empty state', async () => {
  await render(<Submissions />);
  expect(screen.getByText('No submissions yet.')).toBeTruthy();
});

test('shows each submission with its status and photo progress', async () => {
  mockRecords.current = [
    record('a', { phase: 'submitted' }),
    record('b', { phase: 'queued', attempts: 2, lastError: 'network down' }),
    record('c', { phase: 'uploading' }),
  ];
  await render(<Submissions />);

  expect(screen.getByText('Submitted')).toBeTruthy();
  expect(screen.getByText('Waiting to retry (network down)')).toBeTruthy();
  expect(screen.getByText('Uploading…')).toBeTruthy();
  expect(screen.getAllByText('1/2 photos uploaded')).toHaveLength(3);
});

test('offers a manual retry only where it helps, and retries that submission', async () => {
  mockRecords.current = [
    record('a', { phase: 'submitted' }),
    record('b', { phase: 'needs-attention', attentionReason: 'photo_missing:p1' }),
  ];
  await render(<Submissions />);

  expect(screen.getByText('Needs attention: photo_missing:p1')).toBeTruthy();
  expect(screen.getAllByText('Retry now')).toHaveLength(1);

  await fireEvent.press(screen.getByText('Retry now'));
  expect(mockRetry).toHaveBeenCalledWith('b');
});
