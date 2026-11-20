import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { colors, font, radius, type } from './theme';
import { TONES, type Tone } from './tones';

type Props = { label: string; value: number; tone: Tone; icon: IconName };

export function StatTile({ label, value, tone, icon }: Props) {
  const { fg, bg, border } = TONES[tone];
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={[styles.tile, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.row}>
        <Icon name={icon} size={18} color={fg} />
        <Text style={[styles.value, { color: fg }]}>{value}</Text>
      </View>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 24, fontFamily: font.bold, color: colors.ink },
  label: { fontSize: type.micro, fontFamily: font.bold, letterSpacing: 0.6, textTransform: 'uppercase' },
});
