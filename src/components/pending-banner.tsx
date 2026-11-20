import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useOutboxRecords } from '@/features/outbox/runtime';

export function PendingBanner() {
  const records = useOutboxRecords();
  const needsAttention = records.filter((r) => r.phase === 'needs-attention').length;
  const waiting = records.filter((r) => r.phase !== 'submitted' && r.phase !== 'needs-attention').length;
  if (!waiting && !needsAttention) return null;

  return (
    <Link href="/submissions" asChild>
      <Pressable style={[styles.banner, needsAttention ? styles.alert : styles.info]} accessibilityRole="link">
        <Text style={styles.text}>
          {waiting ? `${waiting} waiting to upload` : ''}
          {waiting && needsAttention ? ' · ' : ''}
          {needsAttention ? `${needsAttention} need attention` : ''}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 12, borderRadius: 6 },
  info: { backgroundColor: '#dbeafe' },
  alert: { backgroundColor: '#fee2e2' },
  text: { fontWeight: '600' },
});
