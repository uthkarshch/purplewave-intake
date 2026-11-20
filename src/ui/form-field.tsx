import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, type } from './theme';

type Props = {
  label: string;
  required?: boolean;
  error?: string;
  // Inline puts the control beside the label (a switch); stacked puts it below (an input).
  layout?: 'stacked' | 'inline';
  children: ReactNode;
};

export function FormField({ label, required, error, layout = 'stacked', children }: Props) {
  const labelNode = (
    <Text style={[styles.label, layout === 'inline' && styles.inlineLabel]}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  return (
    <View style={styles.field}>
      {layout === 'inline' ? (
        <View style={styles.inline}>
          {labelNode}
          {children}
        </View>
      ) : (
        <>
          {labelNode}
          {children}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: type.small, fontFamily: font.medium, color: colors.muted },
  required: { color: colors.required },
  inline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  inlineLabel: { flex: 1 },
  error: { fontSize: type.small, fontFamily: font.regular, color: colors.required },
});
