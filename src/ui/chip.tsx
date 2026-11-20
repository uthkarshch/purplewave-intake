import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from './icon';
import { colors, font, radius, type } from './theme';

type Props = { label: string; selected: boolean; onPress: () => void };

// One option of a select field; a row of these sits in a track and reads as a segmented control.
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.active]}
    >
      {selected ? <Icon name="check" size={18} color={colors.onAccent} /> : null}
      <Text style={[styles.text, selected && styles.activeText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexGrow: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  active: { backgroundColor: colors.accent },
  text: { fontSize: type.body, fontFamily: font.medium, color: colors.muted },
  activeText: { color: colors.onAccent },
});
