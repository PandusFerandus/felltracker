import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthNav } from '@/components/month-nav';
import { ScreenHeader } from '@/components/ui';
import { WeightChart } from '@/components/weight-chart';
import { useAppData } from '@/data/app-data';
import { formatWeight } from '@/data/entry-logic';
import { availableMonths, entriesInMonth, itemStats, monthGrid, monthOf, weightPoints, type MonthKey } from '@/data/month-logic';
import { useToday } from '@/data/use-today';
import { colors, fonts, radius } from '@/theme';

export default function TrendScreen() {
  const { monat } = useLocalSearchParams<{ monat?: string }>();
  const { loading, activeDog, entries } = useAppData();
  const today = useToday();
  const months = useMemo(() => availableMonths(today, Object.keys(entries), { untilToday: true }), [today, entries]);
  const [month, setMonth] = useState<MonthKey>(() =>
    typeof monat === 'string' && months.includes(monat) ? monat : monthOf(today),
  );

  if (loading) return null;
  if (!activeDog) return <Redirect href="/" />;

  const monthEntries = entriesInMonth(entries, month, today);
  const stats = itemStats(activeDog.species, monthEntries);
  const weights = weightPoints(monthEntries);
  const max = stats[0]?.days ?? 1;
  const kg = (n: number) => `${formatWeight(n)} kg`;
  const summary =
    weights.length === 0 ? 'kein Wert' : weights.length === 1 ? kg(weights[0].kg) : `${kg(weights[0].kg)} → ${kg(weights[weights.length - 1].kg)}`;
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Verlauf" onBack={goBack} />
      <MonthNav months={months} month={month} onChange={setMonth} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.headRow}>
            <Text accessibilityRole="header" style={styles.cardTitle}>
              Gewicht
            </Text>
            <Text style={styles.summary} accessibilityLabel={weights.length > 1 ? `Anfang ${kg(weights[0].kg)}, Ende ${kg(weights[weights.length - 1].kg)}` : summary}>
              {summary}
            </Text>
          </View>
          {weights.length > 1 && <WeightChart points={weights} daysInMonth={monthGrid(month).days.length} today={today} />}
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>
            An wie vielen Tagen?
          </Text>
          {stats.length === 0 && <Text style={styles.empty}>Noch keine Einträge in diesem Monat.</Text>}
          {stats.map((s) => (
            <View key={`${s.category}:${s.label}`} style={styles.stat} accessible accessibilityLabel={`${s.label}: ${s.days} ${s.days === 1 ? 'Tag' : 'Tage'}`}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statLabel}>{`${s.days} ${s.days === 1 ? 'Tag' : 'Tage'}`}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${Math.round((s.days / max) * 100)}%`, backgroundColor: s.color }]} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 14, gap: 10 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  summary: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.text },
  empty: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  stat: { gap: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, flexShrink: 1 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' },
  bar: { height: 10, borderRadius: 5 },
});
