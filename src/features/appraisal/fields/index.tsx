import type { ComponentType } from 'react';

import type { FieldDef } from '@shared/categories';
import { BooleanField } from './boolean-field';
import { NumberField } from './number-field';
import { SelectField } from './select-field';
import { TextField } from './text-field';
import type { FieldRendererProps } from './types';

// The mapped type makes the compiler demand a renderer for every field type in shared/categories.
export const FIELD_RENDERERS: {
  [T in FieldDef['type']]: ComponentType<FieldRendererProps<Extract<FieldDef, { type: T }>>>;
} = {
  text: TextField,
  number: NumberField,
  select: SelectField,
  boolean: BooleanField,
};

export function FieldRenderer({ field, ...rest }: FieldRendererProps) {
  // The lookup is keyed by field.type, so the renderer always matches this field's variant.
  const Component = FIELD_RENDERERS[field.type] as ComponentType<FieldRendererProps>;
  return <Component field={field} {...rest} />;
}

export type { FieldRendererProps, FieldValue } from './types';
