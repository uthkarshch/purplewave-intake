import { Switch } from 'react-native';

import type { FieldDef } from '@shared/categories';
import { colors, FormField } from '@/ui';
import type { FieldRendererProps } from './types';

type BooleanDef = Extract<FieldDef, { type: 'boolean' }>;

export function BooleanField({ field, value, error, onChange }: FieldRendererProps<BooleanDef>) {
  return (
    <FormField label={field.label} required={field.required} error={error} layout="inline">
      <Switch
        accessibilityLabel={field.label}
        value={value === true}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.fieldLine }}
      />
    </FormField>
  );
}
