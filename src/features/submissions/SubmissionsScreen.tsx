import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useOutbox, useOutboxRecords, type OutboxRecord } from '@/features/outbox';
import { Button, colors, EmptyState, font, Icon, Panel, Pill, radius, StatTile, TONES, type } from '@/ui';
import type { IconName, Tone } from '@/ui';
import { formatWhen } from './format';

type Status = { tone: Tone; label: string; icon: IconName; detail?: string };

function describe(record: OutboxRecord): Status {
  switch (record.phase) {
    case 'submitted':
      return { tone: 'ok', label: 'Submitted', icon: 'check-circle' };
    case 'needs-attention':
      return { tone: 'danger', label: 'Needs attention', icon: 'warning', detail: record.attentionReason ?? 'unknown' };
    case 'queued':
      return record.attempts > 0
        ? { tone: 'retry', label: 'Waiting to retry', icon: 'hourglass-top', detail: record.lastError ?? 'offline' }
        : { tone: 'warn', label: 'Queued', icon: 'inventory-2' };
    default:
      return { tone: 'info', label: 'Uploading…', icon: 'sync' };
  }
}

const isInFlight = (r: OutboxRecord) => r.phase === 'creating' || r.phase === 'uploading' || r.phase === 'finalizing';

function SubmissionCard({ record, onRetry }: { record: OutboxRecord; onRetry: () => void }) {
  const status = describe(record);
  const tone = TONES[status.tone];
  const uploaded = record.photos.filter((p) => p.uploaded).length;
  const total = record.photos.length;
  const percent = total ? Math.round((uploaded / total) * 100) : 0;
  const machine = [record.fields.make, record.fields.model].filter(Boolean).join(' ');
  const canRetry = record.phase === 'needs-attention' || (record.phase === 'queued' && record.attempts > 0);

  return (
    <Panel style={styles.card}>
      <View style={[styles.bar, { backgroundColor: tone.bar }]} />

      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={styles.serial} numberOfLines={1}>
            {String(record.fields.serial || record.fields.make || record.id)}
          </Text>
          {machine ? (
            <Text style={styles.machine} numberOfLines={1}>
              {machine}
            </Text>
          ) : null}
          <Text style={styles.when}>{formatWhen(record.createdAt)}</Text>
        </View>
        <Pill tone={status.tone} icon={status.icon} label={status.label} />
      </View>

      {status.detail ? (
        <View style={[styles.detail, { backgroundColor: tone.bg, borderColor: tone.border }]}>
          <Icon name={status.tone === 'danger' ? 'report-problem' : 'wifi-find'} size={18} color={tone.fg} />
          <Text style={[styles.detailText, { color: tone.fg }]}>{status.detail}</Text>
        </View>
      ) : null}

      {isInFlight(record) ? (
        <View style={styles.progress}>
          <View style={styles.progressHead}>
            <Text style={styles.progressText}>Uploading photos</Text>
            <Text style={styles.progressText}>{`${percent}%`}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${percent}%`, backgroundColor: TONES.info.bar }]} />
          </View>
        </View>
      ) : null}

      <View style={styles.photos}>
        <Icon name="photo-library" size={18} color={colors.muted} />
        <Text style={styles.photosText}>
          {uploaded}/{total} photos uploaded
        </Text>
        <View style={styles.dots}>
          {record.photos.map((p) => (
            <View key={p.id} style={[styles.dot, { backgroundColor: p.uploaded ? TONES.ok.bar : colors.fieldLine }]} />
          ))}
        </View>
      </View>

      {canRetry ? <Button variant="primary" size="compact" icon="publish" title="Retry now" onPress={onRetry} /> : null}
    </Panel>
  );
}

export function SubmissionsScreen() {
  const records = useOutboxRecords();
  const { retry } = useOutbox();
  const items = [...records].reverse();

  const queued = records.filter((r) => r.phase === 'queued').length;
  const uploading = records.filter(isInFlight).length;
  const attention = records.filter((r) => r.phase === 'needs-attention').length;

  return (
    <FlatList
      data={items}
      keyExtractor={(r) => r.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState icon="drive-folder-upload" title="No submissions yet." hint="Saved appraisals appear here while they upload." />
      }
      ListHeaderComponent={
        items.length ? (
          <View style={styles.header}>
            <View style={styles.stats}>
              <StatTile tone="warn" icon="inventory-2" label="Queued" value={queued} />
              <StatTile tone="info" icon="sync" label="Uploading" value={uploading} />
              <StatTile tone="danger" icon="priority-high" label="Attention" value={attention} />
            </View>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Queue and recent history</Text>
              <Text style={styles.count}>{`${items.length} on this device`}</Text>
            </View>
          </View>
        ) : undefined
      }
      ListFooterComponent={
        items.length ? (
          <Panel style={styles.assurance}>
            <View style={styles.assuranceIcon}>
              <Icon name="cloud-done" size={22} color={TONES.ok.fg} />
            </View>
            <View style={styles.assuranceText}>
              <Text style={styles.assuranceTitle}>Saved on this device</Text>
              <Text style={styles.count}>Uploads retry automatically until they succeed.</Text>
            </View>
          </Panel>
        ) : undefined
      }
      renderItem={({ item }) => <SubmissionCard record={item} onRetry={() => void retry(item.id)} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 14, paddingBottom: 32 },
  header: { gap: 16, marginBottom: 2 },
  stats: { flexDirection: 'row', gap: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4 },
  section: { fontSize: type.title, fontFamily: font.bold, color: colors.ink },
  count: { fontSize: type.small, fontFamily: font.regular, color: colors.muted },
  card: { gap: 12, overflow: 'hidden', paddingLeft: 20 },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headText: { flex: 1, gap: 2 },
  serial: { fontSize: type.body, fontFamily: font.bold, letterSpacing: 0.6, color: colors.ink },
  machine: { fontSize: type.label, fontFamily: font.strong, color: colors.muted },
  when: { fontSize: type.small, fontFamily: font.regular, color: colors.muted },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.sm, borderWidth: 1 },
  detailText: { flex: 1, fontSize: type.small, fontFamily: font.strong },
  progress: { gap: 8, padding: 12, borderRadius: radius.sm, backgroundColor: colors.fieldBg, borderWidth: 1, borderColor: colors.line },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: type.small, fontFamily: font.medium, color: colors.accent },
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  photos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  photosText: { flex: 1, fontSize: type.small, fontFamily: font.medium, color: colors.ink },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  assurance: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  assuranceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: TONES.ok.bg,
    borderWidth: 1,
    borderColor: TONES.ok.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceText: { flex: 1, gap: 2 },
  assuranceTitle: { fontSize: type.body, fontFamily: font.medium, color: colors.ink },
});
