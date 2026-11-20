import { fireEvent, render, screen } from '@testing-library/react-native';

import { fakeOutboxApi, OutboxProvider, type OutboxRecord } from '@/features/outbox';
import { SubmissionsScreen } from './SubmissionsScreen';

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

const renderScreen = (records: OutboxRecord[], retry = jest.fn().mockResolvedValue(undefined)) =>
  render(
    <OutboxProvider api={fakeOutboxApi(records, { retry })}>
      <SubmissionsScreen />
    </OutboxProvider>,
  );

test('shows an empty state', async () => {
  await renderScreen([]);
  expect(screen.getByText('No submissions yet.')).toBeTruthy();
});

test('shows each submission with its status and photo progress', async () => {
  await renderScreen([
    record('a', { phase: 'submitted' }),
    record('b', { phase: 'queued', attempts: 2, lastError: 'network down' }),
    record('c', { phase: 'uploading' }),
  ]);

  expect(screen.getByText('Submitted')).toBeTruthy();
  expect(screen.getByText('Waiting to retry')).toBeTruthy();
  expect(screen.getByText('network down')).toBeTruthy();
  expect(screen.getByText('Uploading…')).toBeTruthy();
  expect(screen.getAllByText('1/2 photos uploaded')).toHaveLength(3);
});

test('summarises the queue by state, and shows progress only for uploads in flight', async () => {
  await renderScreen([
    record('a', { phase: 'submitted' }),
    record('b', { phase: 'queued' }),
    record('c', { phase: 'queued', attempts: 1 }),
    record('d', { phase: 'uploading' }),
    record('e', { phase: 'needs-attention', attentionReason: 'photo_missing:p1' }),
  ]);

  expect(screen.getByLabelText('Queued: 2')).toBeTruthy();
  expect(screen.getByLabelText('Uploading: 1')).toBeTruthy();
  expect(screen.getByLabelText('Attention: 1')).toBeTruthy();
  expect(screen.getAllByText('Uploading photos')).toHaveLength(1);
  expect(screen.getByText('50%')).toBeTruthy();
  expect(screen.getByText('5 on this device')).toBeTruthy();
});

test('names the machine from its make and model', async () => {
  await renderScreen([record('a', { fields: { serial: 'SN-1', make: 'Caterpillar', model: '320D' } })]);
  expect(screen.getByText('SN-1')).toBeTruthy();
  expect(screen.getByText('Caterpillar 320D')).toBeTruthy();
});

test('offers a manual retry only where it helps, and retries that submission', async () => {
  const retry = jest.fn().mockResolvedValue(undefined);
  await renderScreen(
    [record('a', { phase: 'submitted' }), record('b', { phase: 'needs-attention', attentionReason: 'photo_missing:p1' })],
    retry,
  );

  expect(screen.getByText('Needs attention')).toBeTruthy();
  expect(screen.getByText('photo_missing:p1')).toBeTruthy();
  expect(screen.getAllByText('Retry now')).toHaveLength(1);

  await fireEvent.press(screen.getByText('Retry now'));
  expect(retry).toHaveBeenCalledWith('b');
});
