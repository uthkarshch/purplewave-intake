import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Icon } from './icon';
import { colors, font, radius, type } from './theme';

type Option = { key: string; label: string };
type Props = { options: Option[]; value: string; onChange: (key: string) => void };

// A row of large pills that scrolls sideways when the options outgrow the screen.
export function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={[styles.pill, selected && styles.active]}
          >
            <Text style={[styles.text, selected && styles.activeText]}>{option.label}</Text>
            {selected ? <Icon name="check-circle" size={18} color={colors.onAccent} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  pill: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  active: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { fontSize: type.body, fontFamily: font.medium, color: colors.ink },
  activeText: { color: colors.onAccent },
});
