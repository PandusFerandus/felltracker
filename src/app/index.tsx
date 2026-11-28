import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayStrip } from '@/components/day-strip';
import { Avatar } from '@/components/avatar';
import { ChevronDownIcon, LineIcon, SettingsIcon } from '@/components/icons';
import { PrimaryButton, StatusMessage, styles as ui } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { itemLines } from '@/data/catalog';
import { ageLabel, monthYearLabel } from '@/data/dates';
import { formatWeight } from '@/data/entry-logic';
import { dayButtonLabel, dayStatus } from '@/data/day-labels';
import type { DateKey } from '@/data/types';
import { useToday } from '@/data/use-today';
import { colors, fonts, radius } from '@/theme';

const TILES = [
  { id: 'calendar', name: 'Kalender', icon: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5' },
  { id: 'trend', name: 'Verlauf', icon: 'M4 18l5-6 4 3 7-9' },
  { id: 'export', name: 'Monatsexport', icon: 'M12 3v12M7 10l5 5 5-5M5 20h14' },
] as const;

export default function HomeScreen() {
  const { loading, error, mode, guestDataQuestion, waitingForFirstSync, activeDog, entries, flash, setFlash, notices, dismissNotices, invites } = useAppData();
  const today = useToday();
  const [picked, setPicked] = useState<DateKey | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Wird geladen" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>{error}</Text>
      </View>
    );
  }
  if (mode === 'unset') return <Redirect href="/anmelden" />;
  if (guestDataQuestion) return <Redirect href="/daten-uebernehmen" />;
  if (!activeDog && waitingForFirstSync) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Wird geladen" />
        <Text style={styles.subtitle}>Deine Daten werden geladen …</Text>
      </View>
    );
  }
  if (!activeDog) return <Redirect href="/hund-anlegen" />;

  const day = picked ?? today;
  const entry = entries[day];
  const lines = entry ? itemLines(activeDog.species, entry.items) : [];
  if (entry?.weightKg != null) lines.push(`Gewicht: ${formatWeight(entry.weightKg)} kg`);
  if (entry?.note) lines.push(`Notiz: ${entry.note}`);
  const dogLine = [activeDog.breed, ageLabel(activeDog.birthday, today)].filter(Boolean).join(' · ');
  const go = (href: Parameters<typeof router.push>[0]) => {
    setMsg(null);
    setFlash(null);
    router.push(href);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.month} accessibilityRole="header">
          {monthYearLabel(day)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Einstellungen"
          onPress={() => go('/einstellungen')}
          style={({ pressed }) => [ui.iconButton, pressed && ui.pressed]}>
          <SettingsIcon />
        </Pressable>
      </View>

      <DayStrip
        today={today}
        selected={day}
        entries={entries}
        species={activeDog.species}
        onSelect={(d) => {
          setPicked(d === today ? null : d);
          setMsg(null);
          setFlash(null);
        }}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.main}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hundeprofil öffnen"
          onPress={() => go('/profil')}
          style={({ pressed }) => [styles.avatar, pressed && ui.pressed]}>
          <Avatar photo={activeDog.photo} size={180} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hund wechseln, ausgewählt: ${activeDog.name}`}
          onPress={() => go('/hunde')}
          style={({ pressed }) => [styles.nameButton, pressed && ui.pressed]}>
          <Text style={styles.name} numberOfLines={2}>
            {activeDog.name}
          </Text>
          <ChevronDownIcon />
        </Pressable>
        {dogLine !== '' && <Text style={styles.subtitle}>{dogLine}</Text>}
        {!!activeDog.sharedWith?.length && <Text style={styles.shared}>Gemeinsam mit {activeDog.sharedWith.join(', ')}</Text>}

        {notices.length > 0 && (
          <View style={styles.notice} role="status" accessibilityLiveRegion="polite">
            {notices.map((n, i) => (
              <Text key={i} style={styles.noticeText}>
                {n}
              </Text>
            ))}
            <Pressable accessibilityRole="button" onPress={dismissNotices} style={styles.noticeButton}>
              <Text style={styles.noticeButtonText}>Verstanden</Text>
            </Pressable>
          </View>
        )}

        {invites.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => go('/hunde')} style={styles.invite}>
            <Text style={styles.inviteText}>
              {invites.length === 1
                ? `Neue Einladung: ${invites[0].dogName} gemeinsam verwalten`
                : `${invites.length} neue Einladungen`}
            </Text>
            <Text style={styles.inviteLink}>Ansehen</Text>
          </Pressable>
        )}

        <View accessibilityLiveRegion="polite" style={styles.dayInfo}>
          <Text style={styles.status}>{dayStatus(day, today, !!entry)}</Text>
          {lines.map((line) => (
            <Text key={line} style={styles.line}>
              {line}
            </Text>
          ))}
        </View>

        {(msg ?? flash) != null && <StatusMessage>{msg ?? flash}</StatusMessage>}

        <View style={styles.tiles}>
          {TILES.map((t) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              onPress={() => {
                const monat = day <= today ? day.slice(0, 7) : today.slice(0, 7);
                if (t.id === 'calendar') go({ pathname: '/kalender', params: { tag: day } });
                else if (t.id === 'trend') go({ pathname: '/verlauf', params: { monat } });
                else go({ pathname: '/export', params: { monat } });
              }}
              style={({ pressed }) => [styles.tile, pressed && ui.pressed]}>
              <LineIcon d={t.icon} />
              <Text style={styles.tileText}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={dayButtonLabel(day, today, !!entry)} onPress={() => {
            setMsg(null);
            setFlash(null);
            router.push({ pathname: '/tag/[date]', params: { date: day } });
          }} style={styles.mainButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 20,
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
  scroll: {
    flex: 1,
  },
  main: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  avatar: {
    borderRadius: 90,
  },
  nameButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
  },
  name: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  shared: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  notice: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 12,
    gap: 6,
  },
  noticeText: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  noticeButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  noticeButtonText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.primary },
  invite: {
    alignSelf: 'stretch',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inviteText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  inviteLink: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.primary },
  dayInfo: {
    alignSelf: 'stretch',
    gap: 2,
  },
  status: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: colors.primary,
    textAlign: 'center',
  },
  line: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  tiles: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tile: {
    flex: 1,
    minHeight: 100,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  tileText: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mainButton: {
    width: '100%',
    maxWidth: 480,
  },
});
