import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { colors, font, type } from './theme';

type Props = { title: string; hint?: string; icon?: IconName };

export function EmptyState({ title, hint, icon }: Props) {
  return (
    <View style={styles.empty}>
      {icon ? <Icon name={icon} size={32} color={colors.accent} /> : null}
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 6, paddingVertical: 48 },
  title: { fontSize: type.title, fontFamily: font.medium, color: colors.ink },
  hint: { fontSize: type.label, fontFamily: font.regular, color: colors.muted, textAlign: 'center' },
});
