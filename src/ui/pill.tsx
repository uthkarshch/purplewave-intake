import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { font, radius, type } from './theme';
import { TONES, type Tone } from './tones';

type Props = { label: string; tone: Tone; icon?: IconName };

export function Pill({ label, tone, icon }: Props) {
  const { fg, bg, border } = TONES[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: border }]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: { fontSize: type.small, fontFamily: font.medium },
});
