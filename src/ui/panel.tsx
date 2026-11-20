import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, font, radius, type } from './theme';

type Props = { children: ReactNode; title?: string; padding?: number; style?: StyleProp<ViewStyle> };

export function Panel({ children, title, padding = 16, style }: Props) {
  return (
    <View style={[styles.panel, { padding }, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <View style={styles.dot} />
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 12, height: 12, borderRadius: radius.pill, backgroundColor: colors.accent },
  title: { fontSize: type.title, fontFamily: font.medium, color: colors.ink },
});
