import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import type { CategoryDef } from '../../shared/categories';

export type FormValues = Record<string, string | boolean>;

export function initialValues(category: CategoryDef): FormValues {
  return Object.fromEntries(category.fields.filter((f) => f.type === 'boolean').map((f) => [f.key, false]));
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
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>
            {field.label}
            {field.required ? ' *' : ''}
            {field.type === 'number' && field.unit ? ` (${field.unit})` : ''}
          </Text>

          {field.type === 'select' ? (
            <View style={styles.chips}>
              {field.options.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  onPress={() => onChange(field.key, option)}
                  style={[styles.chip, values[field.key] === option && styles.chipActive]}
                >
                  <Text>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : field.type === 'boolean' ? (
            <Switch value={values[field.key] === true} onValueChange={(v) => onChange(field.key, v)} />
          ) : (
            <TextInput
              style={styles.input}
              value={typeof values[field.key] === 'string' ? (values[field.key] as string) : ''}
              onChangeText={(v) => onChange(field.key, v)}
              keyboardType={field.type === 'number' ? 'numeric' : 'default'}
              multiline={field.type === 'text' && field.multiline}
            />
          )}

          {errors[field.key] ? <Text style={styles.error}>{errors[field.key]}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  field: { gap: 4 },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#bbb', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  error: { color: '#b91c1c' },
});
