import { StyleSheet, View } from 'react-native';

import type { CategoryDef } from '@shared/categories';
import { FieldRenderer } from './fields';

export type FormValues = Record<string, string | boolean>;

export function initialValues(category: CategoryDef): FormValues {
  const values: FormValues = {};
  for (const field of category.fields) {
    if (field.type === 'boolean') values[field.key] = false;
    else if (field.type === 'select' && field.defaultValue) values[field.key] = field.defaultValue;
  }
  return values;
}

type Props = {
  category: CategoryDef;
  values: FormValues;
  errors: Record<string, string>;
  onChange: (key: string, value: string | boolean) => void;
};

// Renders purely from the category definition, so a new category needs no new screen.
export function CategoryForm({ category, values, errors, onChange }: Props) {
  return (
    <View style={styles.form}>
      {category.fields.map((field) => (
        <FieldRenderer
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
});
