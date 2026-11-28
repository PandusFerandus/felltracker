import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthNav } from '@/components/month-nav';
import { Card, PrimaryButton, ScreenHeader, StatusMessage } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { itemLines } from '@/data/catalog';
import { formatGermanDate, fromDateKey } from '@/data/dates';
import { formatWeight } from '@/data/entry-logic';
import { availableMonths, entriesInMonth, monthName, monthOf, type MonthKey } from '@/data/month-logic';
import { dogLine, monthReportHtml, periodLabel } from '@/data/pdf-html';
import { useToday } from '@/data/use-today';
import { sharePdf } from '@/lib/share-pdf';
import { colors, fonts } from '@/theme';

export default function ExportScreen() {
  const { monat } = useLocalSearchParams<{ monat?: string }>();
  const { loading, activeDog, entries } = useAppData();
  const today = useToday();
  const months = useMemo(() => availableMonths(today, Object.keys(entries), { untilToday: true }), [today, entries]);
  const [month, setMonth] = useState<MonthKey>(() => (typeof monat === 'string' && months.includes(monat) ? monat : monthOf(today)));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (!activeDog) return <Redirect href="/" />;
  const dog = activeDog;
  const rows = entriesInMonth(entries, month, today);
  const line = dogLine(dog, today);

  async function exportPdf() {
    setBusy(true);
    setMsg(null);
    try {
      await sharePdf(monthReportHtml({ dog, month, entries: rows, today }), `${dog.name} – ${monthName(month)}`);
    } catch {
      setMsg('Das PDF konnte nicht erstellt werden. Bitte versuch es noch einmal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title="Monatsexport" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <MonthNav
        months={months}
        month={month}
        onChange={(m) => {
          setMonth(m);
          setMsg(null);
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.preview}>
          <Text style={styles.brand}>Felltagebuch · Monatsübersicht</Text>
          <Text style={styles.name}>{dog.name}</Text>
          {line !== '' && <Text style={styles.meta}>{line}</Text>}
          <Text style={styles.meta}>
            Zeitraum: {periodLabel(month, today)} · erstellt am {formatGermanDate(today)}
          </Text>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Keine Einträge in diesem Zeitraum.</Text>
          ) : (
            <View style={styles.table}>
              <View style={[styles.tr, styles.th]}>
                <Text style={[styles.cell, styles.cDate, styles.head]}>Datum</Text>
                <Text style={[styles.cell, styles.cItems, styles.head]}>Ereignisse und Symptome</Text>
                <Text style={[styles.cell, styles.cKg, styles.head]}>kg</Text>
                <Text style={[styles.cell, styles.cNote, styles.head]}>Notiz</Text>
              </View>
              {rows.map((e) => {
                const d = fromDateKey(e.date);
                const lines = itemLines(dog.species, e.items);
                return (
                  <View key={e.date} style={styles.tr}>
                    <Text style={[styles.cell, styles.cDate]}>{`${d.getDate()}.${d.getMonth() + 1}.`}</Text>
                    <Text style={[styles.cell, styles.cItems]}>{lines.length ? lines.join('\n') : '–'}</Text>
                    <Text style={[styles.cell, styles.cKg]}>{e.weightKg != null ? formatWeight(e.weightKg) : '–'}</Text>
                    <Text style={[styles.cell, styles.cNote]}>{e.note || '–'}</Text>
                  </View>
                );
              })}
            </View>
          )}
          {rows.length > 0 && <Text style={styles.meta}>{`${rows.length} ${rows.length === 1 ? 'Tag' : 'Tage'} mit Einträgen`}</Text>}
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        {msg != null && <StatusMessage>{msg}</StatusMessage>}
        <PrimaryButton label="Monat als PDF exportieren" onPress={exportPdf} disabled={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  preview: { gap: 4 },
  brand: { fontFamily: fonts.extraBold, fontSize: 12, color: colors.primary },
  name: { fontFamily: fonts.extraBold, fontSize: 22, color: colors.text },
  meta: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  empty: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, marginTop: 8 },
  table: { marginTop: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  th: { backgroundColor: colors.surfaceLight, borderBottomWidth: 0, borderRadius: 8 },
  cell: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, paddingVertical: 6, paddingHorizontal: 4 },
  head: { fontFamily: fonts.extraBold },
  cDate: { width: '17%' },
  cItems: { width: '39%' },
  cKg: { width: '12%' },
  cNote: { width: '32%' },
  footer: { gap: 8, paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24 },
});
