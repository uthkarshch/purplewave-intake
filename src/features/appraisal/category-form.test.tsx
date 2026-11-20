import { fireEvent, render, screen } from '@testing-library/react-native';

import { getCategory } from '@shared/categories';
import { CategoryForm, initialValues } from './category-form';

const excavator = getCategory('excavator', 1)!;
const tractor = getCategory('tractor', 1)!;

test('renders the fields of whichever category it is given', async () => {
  const props = { values: {}, errors: {}, onChange: jest.fn() };

  await render(<CategoryForm category={excavator} {...props} />);
  expect(screen.getByText('Undercarriage *')).toBeTruthy();
  expect(screen.queryByText('PTO hours')).toBeNull();

  await screen.unmount();
  await render(<CategoryForm category={tractor} {...props} />);
  expect(screen.getByText('PTO hours')).toBeTruthy();
  expect(screen.getByText('Four-wheel drive')).toBeTruthy();
});

test('select options report their choice and field errors are shown', async () => {
  const onChange = jest.fn();
  await render(<CategoryForm category={excavator} values={{}} errors={{ year: 'Year is required' }} onChange={onChange} />);

  await fireEvent.press(screen.getByText('Fair'));

  expect(onChange).toHaveBeenCalledWith('undercarriage', 'fair');
  expect(screen.getByText('Year is required')).toBeTruthy();
});

test('number fields drop letters and symbols as they are typed', async () => {
  const onChange = jest.fn();
  await render(<CategoryForm category={excavator} values={{}} errors={{}} onChange={onChange} />);

  await fireEvent.changeText(screen.getByLabelText('Hours'), 'ab1,2e3.5.6-');
  await fireEvent.changeText(screen.getByLabelText('Make'), 'CAT 320');

  expect(onChange).toHaveBeenCalledWith('hours', '123.56');
  expect(onChange).toHaveBeenCalledWith('make', 'CAT 320');
});

test('undercarriage opens on Fair, shows title-case labels, and keeps the lowercase stored value', async () => {
  await render(<CategoryForm category={excavator} values={initialValues(excavator)} errors={{}} onChange={jest.fn()} />);

  expect(screen.getByRole('button', { name: 'Fair' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('button', { name: 'Good' }).props.accessibilityState.selected).toBe(false);
  expect(screen.getByRole('button', { name: 'Poor' })).toBeTruthy();
  expect(initialValues(excavator).undercarriage).toBe('fair');
});

test('boolean fields start false so an untouched switch still validates', () => {
  expect(initialValues(tractor)).toEqual({ hitchType: '3-point', fourWheelDrive: false });
  expect(initialValues(excavator)).toEqual({ undercarriage: 'fair' });
});
