import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { colors, fonts, radius } from '@/theme';

export default function SettingsScreen() {
  const { activeDog } = useAppData();
  const items: { href: Href; name: string; text: string }[] = [
    { href: '/profil', name: 'Hundeprofil', text: `Angaben zu ${activeDog?.name ?? 'deinem Hund'} ändern und teilen` },
    { href: '/gemeinsam', name: 'Gemeinsam verwalten', text: 'Dafür brauchst du ein Konto' },
    { href: '/hunde', name: 'Meine Hunde', text: 'Hund wechseln oder hinzufügen' },
    { href: '/konto', name: 'Mein Konto', text: 'Du nutzt die App ohne Konto' },
  ];
  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Einstellungen" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((m) => (
          <Pressable
            key={m.name}
            accessibilityRole="button"
            accessibilityHint={m.text}
            onPress={() => router.push(m.href)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <Text style={styles.name}>{m.name}</Text>
            <Text style={styles.text}>{m.text}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 10, paddingHorizontal: 16, paddingBottom: 24 },
  item: { minHeight: 68, borderRadius: radius.card - 2, backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.8 },
  name: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
});
