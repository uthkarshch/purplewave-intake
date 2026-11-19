import { useRef, useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';

import { PendingBanner } from '@/components/pending-banner';
import { preparePhotos } from '@/outbox/preparePhotos';
import { enqueueSubmission } from '@/outbox/runtime';

const FIELD_KEYS = ['make', 'model', 'year', 'hours', 'serial', 'condition'] as const;
type Fields = Record<(typeof FIELD_KEYS)[number], string>;
const EMPTY: Fields = { make: '', model: '', year: '', hours: '', serial: '', condition: '' };

export default function NewAppraisal() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // Minted when the form opens so a double-tap or a retry can never create a second submission.
  const [submissionId, setSubmissionId] = useState(() => randomUUID());
  const submitting = useRef(false);

  async function addPhotos(source: 'camera' | 'library') {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 1 });
    if (!result.canceled) setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  }

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const photos = await preparePhotos(submissionId, photoUris);
      await enqueueSubmission({ id: submissionId, categoryId: 'excavator', schemaVersion: 1, fields, photos });
      setFields(EMPTY);
      setPhotoUris([]);
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
      <Text style={styles.heading}>Excavator</Text>
      {FIELD_KEYS.map((key) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={key}
          value={fields[key]}
          onChangeText={(value) => setFields((prev) => ({ ...prev, [key]: value }))}
          multiline={key === 'condition'}
        />
      ))}

      <View style={styles.row}>
        <Button title="Take photo" onPress={() => addPhotos('camera')} />
        <Button title="From library" onPress={() => addPhotos('library')} />
      </View>
      <View style={styles.thumbs}>
        {photoUris.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.thumb} />
        ))}
      </View>

      <Button
        title={busy ? 'Saving…' : 'Submit for appraisal'}
        onPress={submit}
        disabled={busy || photoUris.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 6 },
});
