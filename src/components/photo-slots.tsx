import { Button, Image, StyleSheet, Text, View } from 'react-native';

import type { CategoryDef } from '../../shared/categories';

export type PhotoSource = 'camera' | 'library';

type Props = {
  category: CategoryDef;
  shotUris: Record<string, string>;
  extraUris: string[];
  errors: Record<string, string>;
  onPickShot: (shotKey: string, source: PhotoSource) => void;
  onPickExtra: (source: PhotoSource) => void;
};

export function PhotoSlots({ category, shotUris, extraUris, errors, onPickShot, onPickExtra }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Photos</Text>
      {category.photoShots.map((shot) => (
        <View key={shot.key} style={styles.row}>
          {shotUris[shot.key] ? <Image source={{ uri: shotUris[shot.key] }} style={styles.thumb} /> : <View style={[styles.thumb, styles.empty]} />}
          <View style={styles.info}>
            <Text style={styles.label}>
              {shot.label}
              {shot.required ? ' *' : ''}
            </Text>
            {errors[`photo:${shot.key}`] ? <Text style={styles.error}>{errors[`photo:${shot.key}`]}</Text> : null}
          </View>
          <Button title="Camera" onPress={() => onPickShot(shot.key, 'camera')} />
          <Button title="Library" onPress={() => onPickShot(shot.key, 'library')} />
        </View>
      ))}

      <Text style={styles.label}>Extra photos</Text>
      <View style={styles.extras}>
        {extraUris.map((uri) => (
          <Image key={uri} source={{ uri }} style={styles.thumb} />
        ))}
      </View>
      <View style={styles.row}>
        <Button title="Add from camera" onPress={() => onPickExtra('camera')} />
        <Button title="Add from library" onPress={() => onPickExtra('library')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  heading: { fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  info: { flex: 1 },
  label: { fontWeight: '600' },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  empty: { backgroundColor: '#eee' },
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: '#b91c1c' },
});
