import { fireEvent, render, screen } from '@testing-library/react-native';

import { CATEGORIES } from '@shared/categories';
import { PhotoSlots } from './photo-slots';

const category = CATEGORIES[0];
const [first] = category.photoShots;

async function setup(overrides: Partial<React.ComponentProps<typeof PhotoSlots>> = {}) {
  const props = {
    category,
    shotUris: {},
    extraUris: [],
    errors: {},
    onPickShot: jest.fn(),
    onPickExtra: jest.fn(),
    ...overrides,
  };
  await render(<PhotoSlots {...props} />);
  return { props };
}

test('shows no Camera or Library buttons until a box is tapped', async () => {
  await setup();
  expect(screen.queryByText('Camera')).toBeNull();
  expect(screen.queryByText('Library')).toBeNull();
  expect(screen.getByText(`${first.label}${first.required ? ' *' : ''}`)).toBeTruthy();
});

test('tapping a shot box opens the sheet and reports the chosen source', async () => {
  const { props } = await setup();
  await fireEvent.press(screen.getByLabelText(`Add photo: ${first.label}`));

  expect(screen.getByText('Camera')).toBeTruthy();
  expect(screen.getByText('Cancel')).toBeTruthy();
  await fireEvent.press(screen.getByText('Library'));

  expect(props.onPickShot).toHaveBeenCalledWith(first.key, 'library');
  expect(screen.queryByText('Library')).toBeNull();
});

test('tapping a filled box opens the same sheet to replace the photo', async () => {
  const { props } = await setup({ shotUris: { [first.key]: 'file:///a.jpg' } });
  await fireEvent.press(screen.getByLabelText(`Replace photo: ${first.label}`));
  await fireEvent.press(screen.getByText('Camera'));
  expect(props.onPickShot).toHaveBeenCalledWith(first.key, 'camera');
});

test('the extra box uses the same sheet for extra photos', async () => {
  const { props } = await setup();
  await fireEvent.press(screen.getByLabelText('Add extra photo'));
  await fireEvent.press(screen.getByText('Camera'));
  expect(props.onPickExtra).toHaveBeenCalledWith('camera');
});

test('cancelling closes the sheet without picking anything', async () => {
  const { props } = await setup();
  await fireEvent.press(screen.getByLabelText(`Add photo: ${first.label}`));
  await fireEvent.press(screen.getByText('Cancel'));

  expect(screen.queryByText('Camera')).toBeNull();
  expect(props.onPickShot).not.toHaveBeenCalled();
});

test('a validation error shows under its box', async () => {
  await setup({ errors: { [`photo:${first.key}`]: 'Photo required' } });
  expect(screen.getByText('Photo required')).toBeTruthy();
});
