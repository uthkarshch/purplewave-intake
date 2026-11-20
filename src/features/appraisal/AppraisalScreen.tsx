import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { latestCategories } from '@shared/categories';
import { PendingBanner, useOutbox } from '@/features/outbox';
import { Button, colors, Dialog, font, Icon, Panel, SectionLabel, SegmentedControl, type } from '@/ui';
import type { Tone } from '@/ui';
import { CategoryForm } from './category-form';
import { nativeDeps } from './deps';
import { PhotoSlots } from './photos/photo-slots';
import { useAppraisalForm } from './useAppraisalForm';

const CATEGORIES = latestCategories();

type Notice = { tone: Tone; title: string; message: string };

export function AppraisalScreen() {
  const { enqueue } = useOutbox();
  const deps = useMemo(() => ({ ...nativeDeps, enqueue }), [enqueue]);
  const form = useAppraisalForm(CATEGORIES, deps);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function submit() {
    const result = await form.submit();
    if (result.status === 'saved') {
      setNotice({
        tone: 'ok',
        title: 'Saved',
        message: 'Your appraisal is queued and will upload automatically, even if the connection drops.',
      });
    } else if (result.status === 'failed') {
      setNotice({ tone: 'danger', title: 'Could not queue the appraisal', message: result.error });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Dialog
        visible={!!notice}
        tone={notice?.tone ?? 'ok'}
        icon={notice?.tone === 'danger' ? 'report-problem' : 'check-circle'}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onClose={() => setNotice(null)}
      />

      <PendingBanner />

      <View style={styles.categories}>
        <SectionLabel>Equipment category</SectionLabel>
        <SegmentedControl
          options={CATEGORIES.map((c) => ({ key: c.id, label: c.label }))}
          value={form.category.id}
          onChange={form.selectCategory}
        />
      </View>

      <Panel title={`${form.category.label} profile`}>
        <CategoryForm category={form.category} values={form.values} errors={form.errors} onChange={form.setValue} />
      </Panel>

      <Panel>
        <PhotoSlots
          category={form.category}
          shotUris={form.shotUris}
          extraUris={form.extraUris}
          errors={form.errors}
          onPickShot={form.pickShot}
          onPickExtra={form.pickExtra}
        />
      </Panel>

      <View style={styles.footer}>
        <Button
          variant="primary"
          icon="task-alt"
          title={form.busy ? 'Saving…' : 'Submit for appraisal'}
          onPress={submit}
          disabled={form.busy || !form.canSubmit}
        />
        <View style={styles.note}>
          <Icon name="cloud-done" size={16} color={colors.accent} />
          <Text style={styles.noteText}>Auto-uploads when online</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32, gap: 16 },
  categories: { gap: 4 },
  footer: { gap: 8 },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  noteText: { fontSize: type.small, fontFamily: font.regular, color: colors.muted },
});
