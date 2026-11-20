import { fireEvent, render, screen } from '@testing-library/react-native';

import { fakeOutboxApi, OutboxProvider } from '@/features/outbox';
import { AppraisalScreen } from './AppraisalScreen';

const enqueue = jest.fn();

jest.mock('expo-crypto', () => ({ randomUUID: () => 'id-1' }));
jest.mock('expo-image-picker', () => ({}));
jest.mock('./photos/preparePhotos', () => ({ preparePhotos: jest.fn() }));
jest.mock('expo-router', () => ({ Link: ({ children }: { children: unknown }) => children }));

test('submit is disabled while mandatory fields and photos are missing', async () => {
  await render(
    <OutboxProvider api={fakeOutboxApi([], { enqueue })}>
      <AppraisalScreen />
    </OutboxProvider>,
  );
  const submit = screen.getByRole('button', { name: 'Submit for appraisal' });
  expect(submit.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(submit);
  expect(enqueue).not.toHaveBeenCalled();
});
