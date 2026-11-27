import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PawIcon, SettingsIcon } from '@/components/icons';
import { colors, fonts, minTouch, radius } from '@/theme';
import { monthYearLabel } from '@/theme/date';

const SOON = 'Kommt im nächsten Schritt.';

export default function HomeScreen() {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.month} accessibilityRole="header">
          {monthYearLabel(new Date())}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Einstellungen"
          onPress={() => setMsg(SOON)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <SettingsIcon />
        </Pressable>
      </View>

      <View style={styles.main}>
        <View style={styles.avatar}>
          <PawIcon />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          Felltracker
        </Text>
        <Text style={styles.subtitle}>dein Hundetagebuch</Text>
        {msg != null && (
          <Text style={styles.msg} accessibilityLiveRegion="polite" role="status">
            {msg}
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setMsg(SOON)}
          style={({ pressed }) => [styles.mainButton, pressed && styles.pressed]}>
          <Text style={styles.mainButtonText}>Heutigen Tag eingeben</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  month: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: colors.text,
  },
  iconButton: {
    width: 48,
    height: 48,
    minWidth: minTouch,
    minHeight: minTouch,
    borderRadius: radius.small,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 6,
    borderColor: colors.card,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textMuted,
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
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 56,
  },
  mainButton: {
    width: '100%',
    maxWidth: 480,
    minHeight: 64,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    fontFamily: fonts.extraBold,
    fontSize: 19,
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.8,
  },
});
