import { Button, FlatList, StyleSheet, Text, View } from 'react-native';

import { outbox, useOutboxRecords } from '@/features/outbox/runtime';
import type { OutboxRecord } from '@/features/outbox/types';

function statusLabel(record: OutboxRecord): string {
  switch (record.phase) {
    case 'submitted':
      return 'Submitted';
    case 'needs-attention':
      return `Needs attention: ${record.attentionReason ?? 'unknown'}`;
    case 'queued':
      return record.attempts > 0 ? `Waiting to retry (${record.lastError ?? 'offline'})` : 'Queued';
    default:
      return 'Uploading…';
  }
}

export default function Submissions() {
  const records = useOutboxRecords();

  return (
    <FlatList
      data={[...records].reverse()}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text>No submissions yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>{String(item.fields.serial || item.fields.make || item.id)}</Text>
            <Text>{statusLabel(item)}</Text>
            <Text style={styles.muted}>
              {item.photos.filter((p) => p.uploaded).length}/{item.photos.length} photos uploaded
            </Text>
          </View>
          {item.phase === 'needs-attention' || (item.phase === 'queued' && item.attempts > 0) ? (
            <Button title="Retry now" onPress={() => void outbox.retry(item.id)} />
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  info: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
  muted: { color: '#666' },
});
