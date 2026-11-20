import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentType } from 'react';
import { Text } from 'react-native';

import type { FieldDef } from '@shared/categories';
import { FIELD_RENDERERS, FieldRenderer, type FieldRendererProps } from './index';

const field = <T extends FieldDef['type']>(def: Extract<FieldDef, { type: T }>) => def;

test('every field type in the shared definitions has a renderer', () => {
  expect(Object.keys(FIELD_RENDERERS).sort()).toEqual(['boolean', 'number', 'select', 'text']);
});

test('text, number, select and boolean fields render through the registry and report changes', async () => {
  const onChange = jest.fn();

  await render(
    <>
      <FieldRenderer field={field({ key: 'make', label: 'Make', type: 'text', required: true })} value="CAT" onChange={onChange} />
      <FieldRenderer field={field({ key: 'hours', label: 'Hours', type: 'number', unit: 'h', min: 0 })} value="" onChange={onChange} />
      <FieldRenderer field={field({ key: 'gear', label: 'Gear', type: 'select', options: ['low', 'high'] })} value="low" onChange={onChange} />
      <FieldRenderer field={field({ key: 'awd', label: 'All-wheel drive', type: 'boolean' })} value={false} onChange={onChange} />
    </>,
  );

  expect(screen.getByText('Make *')).toBeTruthy();
  expect(screen.getByText('Hours')).toBeTruthy();
  expect(screen.getByText('h')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Make'), 'JD');
  await fireEvent.changeText(screen.getByLabelText('Hours'), '1a2,3');
  await fireEvent.press(screen.getByText('High'));
  await fireEvent(screen.getByLabelText('All-wheel drive'), 'valueChange', true);

  expect(onChange.mock.calls).toEqual([['JD'], ['123'], ['high'], [true]]);
});

test('a field shows its error under it', async () => {
  await render(
    <FieldRenderer field={field({ key: 'year', label: 'Year', type: 'number' })} value="" error="Year is required" onChange={jest.fn()} />,
  );
  expect(screen.getByText('Year is required')).toBeTruthy();
});

test('a new field type needs only a renderer entry', async () => {
  const Stub: ComponentType<FieldRendererProps> = ({ field: f }) => <Text>{`custom ${f.key}`}</Text>;
  const original = FIELD_RENDERERS.text;
  (FIELD_RENDERERS as Record<string, unknown>).text = Stub;
  try {
    await render(<FieldRenderer field={field({ key: 'note', label: 'Note', type: 'text' })} value="" onChange={jest.fn()} />);
    expect(screen.getByText('custom note')).toBeTruthy();
  } finally {
    (FIELD_RENDERERS as Record<string, unknown>).text = original;
  }
});
