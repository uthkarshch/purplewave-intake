import type { FieldDef } from '@shared/categories';
import { FormField, Input } from '@/ui';
import type { FieldRendererProps } from './types';

type TextDef = Extract<FieldDef, { type: 'text' }>;

export function TextField({ field, value, error, onChange }: FieldRendererProps<TextDef>) {
  return (
    <FormField label={field.label} required={field.required} error={error}>
      <Input
        accessibilityLabel={field.label}
        invalid={!!error}
        multiline={field.multiline}
        value={typeof value === 'string' ? value : ''}
        onChangeText={onChange}
      />
    </FormField>
  );
}
