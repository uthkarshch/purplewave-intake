import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryDef } from '@shared/categories';
import { ActionSheet, colors, font, Icon, Pill, radius, TONES, type } from '@/ui';

export type PhotoSource = 'camera' | 'library';

type Props = {
  category: CategoryDef;
  shotUris: Record<string, string>;
  extraUris: string[];
  errors: Record<string, string>;
  onPickShot: (shotKey: string, source: PhotoSource) => void;
  onPickExtra: (source: PhotoSource) => void;
};

type Chooser = { title: string; onChoose: (source: PhotoSource) => void };

type BoxProps = { label: string; required?: boolean; uri?: string; error?: string; a11yLabel: string; onPress: () => void };

function PhotoBox({ label, required, uri, error, a11yLabel, onPress }: BoxProps) {
  return (
    <View style={styles.cell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.box, uri ? styles.filled : styles.dashed, pressed && styles.pressed]}
      >
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.image} />
            <View style={styles.check}>
              <Icon name="check" size={14} color={colors.onAccent} />
            </View>
          </>
        ) : (
          <View style={styles.addIcon}>
            <Icon name="add-a-photo" size={22} color={colors.accent} />
          </View>
        )}
      </Pressable>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function PhotoSlots({ category, shotUris, extraUris, errors, onPickShot, onPickExtra }: Props) {
  const captured = category.photoShots.filter((s) => shotUris[s.key]).length;
  const [chooser, setChooser] = useState<Chooser | null>(null);
  const chooseSource = (title: string, onChoose: (source: PhotoSource) => void) => setChooser({ title, onChoose });
  const choose = (source: PhotoSource) => {
    chooser?.onChoose(source);
    setChooser(null);
  };

  return (
    <View style={styles.container}>
      <ActionSheet
        visible={!!chooser}
        title={chooser?.title ?? ''}
        options={[
          { label: 'Camera', icon: 'photo-camera', onPress: () => choose('camera') },
          { label: 'Library', icon: 'photo-library', onPress: () => choose('library') },
        ]}
        onClose={() => setChooser(null)}
      />
      <View style={styles.header}>
        <Text style={styles.heading}>Inspection photos</Text>
        <Pill tone="ok" icon="photo-camera" label={`${captured} of ${category.photoShots.length} captured`} />
      </View>
      <View style={styles.row}>
        {category.photoShots.map((shot) => (
          <PhotoBox
            key={shot.key}
            uri={shotUris[shot.key]}
            error={errors[`photo:${shot.key}`]}
            a11yLabel={`${shotUris[shot.key] ? 'Replace' : 'Add'} photo: ${shot.label}`}
            label={shot.label}
            required={shot.required}
            onPress={() => chooseSource(shot.label, (source) => onPickShot(shot.key, source))}
          />
        ))}
      </View>

      <Text style={styles.heading}>Extra photos</Text>
      <View style={styles.row}>
        {extraUris.map((uri) => (
          <View key={uri} style={styles.cell}>
            <Image source={{ uri }} style={[styles.box, styles.image]} />
          </View>
        ))}
        <PhotoBox a11yLabel="Add extra photo" label="Extra" onPress={() => chooseSource('Extra photo', onPickExtra)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heading: { fontSize: type.title, fontFamily: font.medium, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '30%', gap: 6 },
  box: { aspectRatio: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dashed: { backgroundColor: colors.fieldBg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.fieldLine },
  filled: { borderWidth: 1, borderColor: colors.line },
  image: { width: '100%', height: '100%' },
  pressed: { opacity: 0.7 },
  addIcon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: TONES.ok.bar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: type.small, fontFamily: font.medium, color: colors.ink },
  required: { color: colors.required },
  error: { fontSize: type.small, fontFamily: font.regular, color: colors.required },
});
