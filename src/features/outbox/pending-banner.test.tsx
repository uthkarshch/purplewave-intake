import { act, render, screen } from '@testing-library/react-native';

import { fakeOutboxApi } from './fake-api';
import { OutboxProvider, useOutbox, useOutboxRecords } from './OutboxProvider';
import { PendingBanner } from './pending-banner';
import type { OutboxRecord } from './types';

jest.mock('expo-router', () => ({ Link: ({ children }: { children: unknown }) => children }));

const withPhase = (phase: OutboxRecord['phase']) => ({ id: phase, phase }) as OutboxRecord;

const renderBanner = (api = fakeOutboxApi()) =>
  render(
    <OutboxProvider api={api}>
      <PendingBanner />
    </OutboxProvider>,
  );

test('renders nothing when everything has been submitted', async () => {
  await renderBanner(fakeOutboxApi([withPhase('submitted')]));
  expect(screen.toJSON()).toBeNull();
});

test('counts waiting and needs-attention submissions separately', async () => {
  await renderBanner(
    fakeOutboxApi([withPhase('queued'), withPhase('uploading'), withPhase('needs-attention'), withPhase('submitted')]),
  );
  expect(screen.getByText('2 waiting to upload')).toBeTruthy();
  expect(screen.getByText('1 need attention')).toBeTruthy();
});

test('updates when the outbox changes', async () => {
  const api = fakeOutboxApi();
  await renderBanner(api);
  expect(screen.toJSON()).toBeNull();

  await act(async () => api.setRecords([withPhase('queued')]));
  expect(screen.getByText('1 waiting to upload')).toBeTruthy();
});

test('outbox hooks fail loudly outside a provider', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const Probe = ({ hook }: { hook: () => unknown }) => (hook(), null);

  await expect(render(<Probe hook={useOutboxRecords} />)).rejects.toThrow('OutboxProvider');
  await expect(render(<Probe hook={useOutbox} />)).rejects.toThrow('OutboxProvider');
  spy.mockRestore();
});
