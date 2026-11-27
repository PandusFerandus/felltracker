import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthNav } from '@/components/month-nav';
import { PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { catalogFor, categoriesOf, itemLines } from '@/data/catalog';
import { isDateKey, longDate } from '@/data/dates';
import { formatWeight } from '@/data/entry-logic';
import { availableMonths, defaultDayForMonth, monthGrid, monthOf } from '@/data/month-logic';
import type { DateKey } from '@/data/types';
import { useToday } from '@/data/use-today';
import { colors, fonts, radius } from '@/theme';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarScreen() {
  const { tag } = useLocalSearchParams<{ tag?: string }>();
  const { loading, activeDog, entries, flash, setFlash } = useAppData();
  const today = useToday();
  const [day, setDay] = useState<DateKey>(() => (typeof tag === 'string' && isDateKey(tag) ? tag : today));
  const months = useMemo(() => availableMonths(today, Object.keys(entries)), [today, entries]);

  // Meldungen nach dem Speichern nur hier zeigen und beim Verlassen entfernen.
  useEffect(() => () => setFlash(null), [setFlash]);

  if (loading) return null;
  if (!activeDog) return <Redirect href="/" />;

  const month = monthOf(day);
  const { blanks, days } = monthGrid(month);
  const entry = entries[day];
  const future = day > today;
  const lines = entry ? itemLines(activeDog.species, entry.items) : [];
  if (entry?.weightKg != null) lines.push(`Gewicht: ${formatWeight(entry.weightKg)} kg`);
  if (entry?.note) lines.push(`Notiz: ${entry.note}`);
  if (!entry) lines.push(future ? 'Noch kein Termin.' : 'Noch kein Eintrag.');

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const cells: (DateKey | null)[] = [...Array<null>(blanks).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (DateKey | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Kalender" onBack={goBack} />
      <MonthNav
        months={months}
        month={month}
        onChange={(m) => {
          setDay(defaultDayForMonth(m, today));
          setFlash(null);
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.week}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday} accessibilityElementsHidden importantForAccessibility="no">
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.week}>
              {week.map((d, di) => {
                if (!d) return <View key={`b${di}`} style={styles.cell} />;
                const x = entries[d];
                const selected = d === day;
                const bg = x ? colors.surfaceLight : '#F5F8F4';
                const dots = x ? categoriesOf(activeDog.species, x.items) : [];
                return (
                  <View key={d} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${d === today ? 'Heute, ' : ''}${longDate(d, today)}, ${x ? 'mit Eintrag' : 'ohne Eintrag'}`}
                      aria-selected={selected}
                      onPress={() => {
                        setDay(d);
                        setFlash(null);
                      }}
                      style={[styles.day, { backgroundColor: bg, borderColor: selected ? colors.primary : d === today ? colors.border : bg }]}>
                      <Text style={[styles.dayNum, d > today && styles.future]}>{Number(d.slice(8))}</Text>
                      <View style={styles.dots}>
                        {dots.map((c) => (
                          <View key={c.id} style={[styles.dot, { backgroundColor: c.color }]} />
                        ))}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          {catalogFor(activeDog.species).map((c) => (
            <View key={c.id} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: c.color }]} />
              <Text style={styles.legendText}>{c.short}</Text>
            </View>
          ))}
        </View>

        {flash != null && <StatusMessage>{flash}</StatusMessage>}

        <View style={[styles.card, styles.detail]} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={styles.detailTitle}>
            {d2(day, today)}
          </Text>
          {lines.map((l) => (
            <Text key={l} style={styles.detailLine}>
              {l}
            </Text>
          ))}
          <PrimaryButton
            label={future ? 'Termin eintragen oder ändern' : 'Diesen Tag eintragen oder ändern'}
            onPress={() => {
              setFlash(null);
              router.push({ pathname: '/tag/[date]', params: { date: day } });
            }}
            small
            style={styles.detailButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const d2 = (day: DateKey, today: DateKey) => (day === today ? `Heute, ${longDate(day, today)}` : longDate(day, today));

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 10, gap: 3 },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 12, color: colors.textMuted, paddingBottom: 5 },
  cell: { flex: 1, padding: 1.5 },
  day: { height: 48, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNum: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  future: { color: '#5F7066' },
  dots: { flexDirection: 'row', gap: 2, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  detail: { padding: 14, gap: 6 },
  detailTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  detailLine: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  detailButton: { marginTop: 6 },
});
