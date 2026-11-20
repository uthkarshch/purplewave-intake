import { sanitizeNumberInput, type FieldDef } from '@shared/categories';
import { FormField, Input } from '@/ui';
import type { FieldRendererProps } from './types';

type NumberDef = Extract<FieldDef, { type: 'number' }>;

export function NumberField({ field, value, error, onChange }: FieldRendererProps<NumberDef>) {
  const allowNegative = field.min === undefined || field.min < 0;
  return (
    <FormField label={field.label} required={field.required} error={error}>
      <Input
        accessibilityLabel={field.label}
        invalid={!!error}
        keyboardType="numeric"
        suffix={field.unit}
        value={typeof value === 'string' ? value : ''}
        onChangeText={(text) => onChange(sanitizeNumberInput(text, allowNegative))}
      />
    </FormField>
  );
}
