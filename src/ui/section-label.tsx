import { StyleSheet, Text } from 'react-native';

import { colors, font, type } from './theme';

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: type.micro,
    fontFamily: font.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.accent,
  },
});
