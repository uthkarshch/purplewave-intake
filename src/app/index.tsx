import { useState } from 'react';
import {
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { submitNaive, type ExcavatorFields } from '@/api/naiveSubmit';
import { getApiBaseUrl } from '@/config';

const EMPTY: ExcavatorFields = { make: '', model: '', year: '', hours: '', serial: '', condition: '' };

export default function NewAppraisal() {
  const [fields, setFields] = useState<ExcavatorFields>(EMPTY);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof ExcavatorFields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  async function addPhotos(source: 'camera' | 'library') {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 1 });
    if (!result.canceled) setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
  }

  async function submit() {
    setBusy(true);
    try {
      const photos = photoUris.map((uri) => new File(uri));
      const { id } = await submitNaive(
        getApiBaseUrl(),
        fields,
        photos as unknown as Blob[],
        expoFetch as unknown as typeof fetch,
      );
      Alert.alert('Submitted', `Submission ${id} received.`);
      setFields(EMPTY);
      setPhotoUris([]);
    } catch (e) {
      Alert.alert('Submit failed', String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Excavator</Text>
      {(Object.keys(EMPTY) as (keyof ExcavatorFields)[]).map((key) => (
        <TextInput
          key={key}
          style={styles.input}
          placeholder={key}
          value={fields[key]}
          onChangeText={set(key)}
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

      <Button title={busy ? 'Submitting…' : 'Submit for appraisal'} onPress={submit} disabled={busy} />
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
