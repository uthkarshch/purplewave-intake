import { fireEvent, render, screen } from '@testing-library/react-native';

import { getCategory } from '../../shared/categories';
import { CategoryForm, initialValues } from './category-form';

const excavator = getCategory('excavator', 1)!;
const tractor = getCategory('tractor', 1)!;

test('renders the fields of whichever category it is given', async () => {
  const props = { values: {}, errors: {}, onChange: jest.fn() };

  await render(<CategoryForm category={excavator} {...props} />);
  expect(screen.getByText('Undercarriage *')).toBeTruthy();
  expect(screen.queryByText('PTO hours (h)')).toBeNull();

  await screen.unmount();
  await render(<CategoryForm category={tractor} {...props} />);
  expect(screen.getByText('PTO hours (h)')).toBeTruthy();
  expect(screen.getByText('Four-wheel drive')).toBeTruthy();
});

test('select options report their choice and field errors are shown', async () => {
  const onChange = jest.fn();
  await render(<CategoryForm category={excavator} values={{}} errors={{ year: 'Year is required' }} onChange={onChange} />);

  await fireEvent.press(screen.getByText('fair'));

  expect(onChange).toHaveBeenCalledWith('undercarriage', 'fair');
  expect(screen.getByText('Year is required')).toBeTruthy();
});

test('boolean fields start false so an untouched switch still validates', () => {
  expect(initialValues(tractor)).toEqual({ fourWheelDrive: false });
  expect(initialValues(excavator)).toEqual({});
});
