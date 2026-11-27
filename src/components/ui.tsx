import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/theme';

import { BackIcon } from './icons';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  small,
  style,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  /** Kleinere Ausführung, z. B. innerhalb einer Karte */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, small && styles.primarySmall, (pressed || disabled) && styles.pressed, style]}>
      <Text style={[styles.primaryText, small && styles.primaryTextSmall]}>{label}</Text>
    </Pressable>
  );
}

/** Kopfzeile von Unterseiten mit Zurück-Knopf und Titel. */
export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zurück"
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <BackIcon />
        </Pressable>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

/** Kurzer Hinweis, der Bildschirmlesern vorgelesen wird. */
export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <Text role="status" accessibilityLiveRegion="polite" style={styles.msg}>
      {children}
    </Text>
  );
}

export const styles = StyleSheet.create({
  primary: {
    minHeight: 64,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryText: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  primarySmall: {
    minHeight: 48,
    borderRadius: 24,
  },
  primaryTextSmall: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.small,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 21,
    color: colors.text,
  },
  msg: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
});
