import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius } from '@/theme';

type Props = {
  visible: boolean;
  hasPhoto: boolean;
  onCamera(): void;
  onLibrary(): void;
  onRemove(): void;
  onClose(): void;
};

/** Auswahl beim Tippen auf das Profilbild. */
export function PhotoSheet({ visible, hasPhoto, onCamera, onLibrary, onRemove, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]} role="dialog" aria-label="Profilbild ändern">
        <Text accessibilityRole="header" style={styles.title}>
          Profilbild ändern
        </Text>
        <Option label="Foto aufnehmen" onPress={onCamera} />
        <Option label="Aus Mediathek wählen" onPress={onLibrary} />
        {hasPhoto && <Option label="Foto entfernen" onPress={onRemove} />}
        <Option label="Abbrechen" onPress={onClose} muted />
      </View>
    </Modal>
  );
}

function Option({ label, onPress, muted }: { label: string; onPress(): void; muted?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, muted && styles.muted, pressed && styles.pressed]}>
      <Text style={[styles.optionText, muted && styles.mutedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,46,34,0.4)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 10,
  },
  title: { fontFamily: fonts.extraBold, fontSize: 19, color: colors.text, textAlign: 'center', marginBottom: 4 },
  option: {
    minHeight: 54,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.primary },
  muted: { backgroundColor: 'transparent' },
  mutedText: { color: colors.textMuted },
  pressed: { opacity: 0.8 },
});
