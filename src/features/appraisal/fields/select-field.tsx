import { StyleSheet, View } from 'react-native';

import type { FieldDef } from '@shared/categories';
import { Chip, colors, FormField, radius } from '@/ui';
import type { FieldRendererProps } from './types';

type SelectDef = Extract<FieldDef, { type: 'select' }>;

// Stored values stay as defined (the server validates against them); only the label changes.
const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function SelectField({ field, value, error, onChange }: FieldRendererProps<SelectDef>) {
  return (
    <FormField label={field.label} required={field.required} error={error}>
      <View style={styles.track}>
        {field.options.map((option) => (
          <Chip key={option} label={titleCase(option)} selected={value === option} onPress={() => onChange(option)} />
        ))}
      </View>
    </FormField>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
});
