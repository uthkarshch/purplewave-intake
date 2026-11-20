import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActionSheet, Chip, Dialog, EmptyState, FormField, Panel, Pill, SegmentedControl } from '@/ui';

test('Chip reports presses and exposes its selected state', async () => {
  const onPress = jest.fn();
  await render(<Chip label="fair" selected onPress={onPress} />);

  const chip = screen.getByRole('button', { name: 'fair' });
  expect(chip.props.accessibilityState.selected).toBe(true);
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('SegmentedControl marks the current option and reports the chosen key', async () => {
  const onChange = jest.fn();
  await render(
    <SegmentedControl
      options={[
        { key: 'a', label: 'Alpha' },
        { key: 'b', label: 'Beta' },
      ]}
      value="a"
      onChange={onChange}
    />,
  );

  expect(screen.getByRole('tab', { name: 'Alpha' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('tab', { name: 'Beta' }).props.accessibilityState.selected).toBe(false);
  await fireEvent.press(screen.getByText('Beta'));
  expect(onChange).toHaveBeenCalledWith('b');
});

test('Pill shows its label', async () => {
  await render(<Pill label="Submitted" tone="ok" />);
  expect(screen.getByText('Submitted')).toBeTruthy();
});

test('FormField shows label, control and error in either layout', async () => {
  await render(
    <>
      <FormField label="Year" required error="Year is required">
        <Text>stacked control</Text>
      </FormField>
      <FormField label="Four-wheel drive" layout="inline">
        <Text>inline control</Text>
      </FormField>
    </>,
  );

  for (const text of ['Year *', 'Year is required', 'stacked control', 'Four-wheel drive', 'inline control']) {
    expect(screen.getByText(text)).toBeTruthy();
  }
});

test('FormField renders no error line without an error', async () => {
  await render(
    <FormField label="Make">
      <Text>control</Text>
    </FormField>,
  );
  expect(screen.queryByText('Year is required')).toBeNull();
});

test('EmptyState hint is optional', async () => {
  await render(<EmptyState title="Nothing here" />);
  expect(screen.getByText('Nothing here')).toBeTruthy();

  await screen.unmount();
  await render(<EmptyState title="Nothing here" hint="Come back later" />);
  expect(screen.getByText('Come back later')).toBeTruthy();
});

test('Panel renders its children', async () => {
  await render(
    <Panel>
      <Text>inside</Text>
    </Panel>,
  );
  expect(screen.getByText('inside')).toBeTruthy();
});

test('Dialog shows its title and message only while visible, and OK or the backdrop closes it', async () => {
  const onClose = jest.fn();
  const props = { tone: 'ok' as const, icon: 'check-circle' as const, title: 'Saved', message: 'All good', onClose };

  await render(<Dialog {...props} visible={false} />);
  expect(screen.queryByText('Saved')).toBeNull();

  await screen.unmount();
  await render(<Dialog {...props} visible />);
  expect(screen.getByText('Saved')).toBeTruthy();
  expect(screen.getByText('All good')).toBeTruthy();

  await fireEvent.press(screen.getByText('OK'));
  await fireEvent.press(screen.getByTestId('dialog-backdrop', { includeHiddenElements: true }));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('ActionSheet lists its options plus Cancel, and each reports its own press', async () => {
  const camera = jest.fn();
  const library = jest.fn();
  const onClose = jest.fn();
  await render(
    <ActionSheet
      visible
      title="Front"
      options={[
        { label: 'Camera', icon: 'photo-camera', onPress: camera },
        { label: 'Library', icon: 'photo-library', onPress: library },
      ]}
      onClose={onClose}
    />,
  );

  expect(screen.getByText('Front')).toBeTruthy();
  await fireEvent.press(screen.getByText('Library'));
  await fireEvent.press(screen.getByText('Cancel'));
  await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));

  expect(library).toHaveBeenCalledTimes(1);
  expect(camera).not.toHaveBeenCalled();
  expect(onClose).toHaveBeenCalledTimes(2);
});
