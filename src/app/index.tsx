import { useRef, useState } from 'react';
import { Alert, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { coerceValues, latestCategories, validateSubmission } from '../../shared/categories';
import { CategoryForm, initialValues, type FormValues } from '@/components/category-form';
import { PendingBanner } from '@/components/pending-banner';
import { PhotoSlots, type PhotoSource } from '@/components/photo-slots';
import { preparePhotos } from '@/features/outbox/preparePhotos';
import { enqueueSubmission } from '@/features/outbox/runtime';

const CATEGORIES = latestCategories();

async function pickUris(source: PhotoSource, multiple: boolean): Promise<string[]> {
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: multiple, quality: 1 });
  return result.canceled ? [] : result.assets.map((a) => a.uri);
}

export default function NewAppraisal() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [values, setValues] = useState<FormValues>(() => initialValues(CATEGORIES[0]));
  const [shotUris, setShotUris] = useState<Record<string, string>>({});
  const [extraUris, setExtraUris] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // Minted when the form opens so a double-tap or a retry can never create a second submission.
  const [submissionId, setSubmissionId] = useState(() => randomUUID());
  const submitting = useRef(false);

  function reset(next = category) {
    setCategory(next);
    setValues(initialValues(next));
    setShotUris({});
    setExtraUris([]);
    setErrors({});
  }

  async function submit() {
    if (submitting.current) return;

    const photoItems = [
      ...category.photoShots.filter((s) => shotUris[s.key]).map((s) => ({ id: s.key, uri: shotUris[s.key] })),
      ...extraUris.map((uri, i) => ({ id: `extra-${i}`, uri })),
    ];
    const fields = coerceValues(category, values);
    const problems = validateSubmission(category, fields, photoItems.map((p) => p.id));
    setErrors(Object.fromEntries(problems.map((p) => [p.field, p.message])));
    if (problems.length) return;

    submitting.current = true;
    setBusy(true);
    try {
      const photos = await preparePhotos(submissionId, photoItems);
      await enqueueSubmission({
        id: submissionId,
        categoryId: category.id,
        schemaVersion: category.schemaVersion,
        fields,
        photos,
      });
      reset();
      setSubmissionId(randomUUID());
      Alert.alert('Saved', 'Your appraisal is queued and will upload automatically, even if the connection drops.');
    } catch (e) {
      Alert.alert('Could not queue the appraisal', e instanceof Error ? e.message : String(e));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <PendingBanner />

      <View style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="tab"
            onPress={() => reset(c)}
            style={[styles.tab, c.id === category.id && styles.tabActive]}
          >
            <Text style={styles.tabText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <CategoryForm
        category={category}
        values={values}
        errors={errors}
        onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
      />

      <PhotoSlots
        category={category}
        shotUris={shotUris}
        extraUris={extraUris}
        errors={errors}
        onPickShot={async (key, source) => {
          const [uri] = await pickUris(source, false);
          if (uri) setShotUris((prev) => ({ ...prev, [key]: uri }));
        }}
        onPickExtra={async (source) => {
          const uris = await pickUris(source, true);
          setExtraUris((prev) => [...prev, ...uris]);
        }}
      />

      <Button title={busy ? 'Saving…' : 'Submit for appraisal'} onPress={submit} disabled={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 16 },
  tabActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  tabText: { fontWeight: '600' },
});
