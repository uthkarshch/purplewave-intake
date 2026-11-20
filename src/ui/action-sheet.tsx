import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from './button';
import type { IconName } from './icon';
import { colors, font, radius, type } from './theme';

type Option = { label: string; icon: IconName; onPress: () => void };
type Props = { visible: boolean; title: string; options: Option[]; onClose: () => void };

// A bottom sheet of large actions, replacing the native Alert chooser. The first option is the primary one.
export function ActionSheet({ visible, title, options, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable testID="sheet-backdrop" accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {options.map((option, index) => (
            <Button
              key={option.label}
              variant={index === 0 ? 'primary' : 'secondary'}
              icon={option.icon}
              title={option.label}
              onPress={option.onPress}
            />
          ))}
          <Button title="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  sheet: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radius.pill, backgroundColor: colors.fieldLine },
  title: { fontSize: type.title, fontFamily: font.bold, color: colors.ink, marginVertical: 6 },
});
