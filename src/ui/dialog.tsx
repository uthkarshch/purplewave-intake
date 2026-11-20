import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from './button';
import { Icon, type IconName } from './icon';
import { colors, font, radius, type } from './theme';
import { TONES, type Tone } from './tones';

type Props = {
  visible: boolean;
  tone: Tone;
  icon: IconName;
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

// A centred notice with one confirm action, replacing the native Alert.
export function Dialog({ visible, tone, icon, title, message, confirmLabel = 'OK', onClose }: Props) {
  const { fg, bg, border } = TONES[tone];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable testID="dialog-backdrop" accessibilityLabel="Dismiss" style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal style={styles.card}>
          <View style={[styles.icon, { backgroundColor: bg, borderColor: border }]}>
            <Icon name={icon} size={26} color={fg} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button variant="primary" title={confirmLabel} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  icon: { width: 52, height: 52, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: type.title, fontFamily: font.bold, color: colors.ink },
  message: { fontSize: type.body, fontFamily: font.regular, lineHeight: 24, color: colors.muted, marginBottom: 4 },
});
