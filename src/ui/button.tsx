import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from './icon';
import { colors, font, radius, type } from './theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'regular' | 'compact';
  icon?: IconName;
  disabled?: boolean;
  flex?: boolean;
};

export function Button({ title, onPress, variant = 'secondary', size = 'regular', icon, disabled, flex }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'compact' && styles.compact,
        primary ? styles.primary : styles.secondary,
        flex && styles.flex,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <Icon name={icon} size={size === 'compact' ? 18 : 24} color={primary ? colors.onAccent : colors.accent} /> : null}
      <Text style={[styles.text, primary && styles.primaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.sm },
  flex: { flex: 1 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.track, borderWidth: 1, borderColor: colors.fieldLine },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  text: { fontSize: type.body, fontFamily: font.medium, color: colors.ink },
  primaryText: { color: colors.onAccent },
});
