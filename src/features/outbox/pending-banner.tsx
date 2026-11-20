import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, Icon, Pill, radius, type } from '@/ui';
import { useOutboxRecords } from './OutboxProvider';

export function PendingBanner() {
  const records = useOutboxRecords();
  const needsAttention = records.filter((r) => r.phase === 'needs-attention').length;
  const waiting = records.filter((r) => r.phase !== 'submitted' && r.phase !== 'needs-attention').length;
  if (!waiting && !needsAttention) return null;

  return (
    <Link href="/submissions" asChild>
      <Pressable accessibilityRole="link" style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
        <View style={styles.iconTile}>
          <Icon name="cloud-sync" size={26} color={colors.accent} />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Pending uploads</Text>
            {needsAttention ? <Pill tone="danger" label={`${needsAttention} need attention`} /> : null}
          </View>
          {waiting ? <Text style={styles.sub}>{`${waiting} waiting to upload`}</Text> : null}
        </View>
        <View style={styles.arrow}>
          <Icon name="arrow-forward" size={20} color={colors.accent} />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.85 },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { fontSize: type.title, fontFamily: font.medium, color: colors.ink },
  sub: { fontSize: type.label, fontFamily: font.regular, color: colors.muted },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
