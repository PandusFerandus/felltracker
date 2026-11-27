import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { PrimaryButton, ScreenHeader } from '@/components/ui';
import { useAppData } from '@/data/app-data';
import { catalogFor, type Category } from '@/data/catalog';
import { isDateKey, longDate } from '@/data/dates';
import { formatWeight, itemsForCategory, sameItem, toggleItem, type Draft } from '@/data/entry-logic';
import type { CategoryId, DateKey, DayEntry, Dog, SelectedItem } from '@/data/types';
import { useToday } from '@/data/use-today';
import { colors, fonts, radius } from '@/theme';

export default function DayEntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { loading, activeDog, entries } = useAppData();
  const today = useToday();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Wird geladen" />
      </View>
    );
  }
  if (!activeDog || typeof date !== 'string' || !isDateKey(date)) return <Redirect href="/" />;

  return <EntryForm key={`${activeDog.id}:${date}`} dog={activeDog} date={date} today={today} entry={entries[date]} />;
}

function EntryForm({ dog, date, today, entry }: { dog: Dog; date: DateKey; today: DateKey; entry: DayEntry | undefined }) {
  const { customItems, saveDay, addCustomItem, setFlash } = useAppData();
  const future = date > today;
  const [draft, setDraft] = useState<Draft>(() => ({
    items: entry?.items ?? [],
    weight: entry?.weightKg != null ? formatWeight(entry.weightKg) : '',
    note: entry?.note ?? '',
  }));
  const [adding, setAdding] = useState<CategoryId | null>(null);
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = date === today ? `Heute, ${longDate(date, today)}` : future ? `Termin: ${longDate(date, today)}` : longDate(date, today);
  const categories = catalogFor(dog.species).filter((c) => !future || c.id === 'events');
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const update = (part: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...part }));
    setMsg(null);
  };

  async function confirmAdd(category: CategoryId) {
    const name = newName.trim();
    if (!name) {
      setMsg('Bitte gib einen Namen ein.');
      return;
    }
    try {
      const { item, existed } = await addCustomItem(category, name);
      setDraft((d) => (d.items.some((i) => sameItem(i, item)) ? d : { ...d, items: [...d.items, item] }));
      setAdding(null);
      setNewName('');
      setMsg(existed ? `„${item.label}“ gibt es schon, es ist jetzt ausgewählt.` : null);
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await saveDay(date, draft, future);
      if ('error' in res) {
        setMsg(res.error);
        setSaving(false);
        return;
      }
      setFlash(
        res.result === 'deleted'
          ? 'Eintrag gelöscht.'
          : future
            ? `Termin am ${longDate(date, today)} gespeichert.`
            : `Eintrag für ${longDate(date, today)} gespeichert.`,
      );
      goBack();
    } catch {
      setMsg('Das hat nicht geklappt. Bitte versuch es noch einmal.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScreenHeader title={title} onBack={goBack} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {categories.map((c) => (
            <CategorySection
              key={c.id}
              category={c}
              labels={itemsForCategory(dog.species, c.id, customItems)}
              selected={draft.items}
              onToggle={(item) => update({ items: toggleItem(draft.items, item) })}
              adding={adding === c.id}
              onStartAdd={() => {
                setAdding(c.id);
                setNewName('');
                setMsg(null);
              }}
              newName={newName}
              onChangeName={setNewName}
              onConfirmAdd={() => confirmAdd(c.id)}
            />
          ))}

          {!future && (
            <View style={[styles.card, styles.weightRow]}>
              <Text style={styles.cardTitle}>
                Gewicht
              </Text>
              <TextInput
                value={draft.weight}
                onChangeText={(t) => update({ weight: t })}
                accessibilityLabel="Gewicht in Kilogramm"
                placeholder="z. B. 24,6"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                inputMode="decimal"
                maxLength={6}
                style={[styles.input, styles.weightInput]}
              />
              <Text style={styles.unit}>kg</Text>
            </View>
          )}

          <Text style={styles.noteLabel}>
            {future ? 'Notiz zum Termin' : 'Weitere Notizen'}
          </Text>
          <TextInput
            value={draft.note}
            onChangeText={(t) => update({ note: t })}
            accessibilityLabel={future ? 'Notiz zum Termin' : 'Weitere Notizen'}
            placeholder={future ? 'z. B. Uhrzeit oder Praxis' : 'Alles, was dir sonst auffällt'}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            style={[styles.input, styles.note]}
          />
        </ScrollView>

        <View style={styles.footer}>
          {msg != null && (
            <Text role="status" accessibilityLiveRegion="polite" style={styles.msg}>
              {msg}
            </Text>
          )}
          <PrimaryButton label={future ? 'Termin speichern' : 'Tag speichern'} onPress={save} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type SectionProps = {
  category: Category;
  labels: string[];
  selected: SelectedItem[];
  onToggle(item: SelectedItem): void;
  adding: boolean;
  onStartAdd(): void;
  newName: string;
  onChangeName(t: string): void;
  onConfirmAdd(): void;
};

function CategorySection({ category, labels, selected, onToggle, adding, onStartAdd, newName, onChangeName, onConfirmAdd }: SectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={[styles.catDot, { backgroundColor: category.color }]} />
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {category.name}
        </Text>
      </View>
      <View style={styles.chips}>
        {labels.map((label) => {
          const item = { category: category.id, label };
          const on = selected.some((i) => sameItem(i, item));
          return (
            <Pressable
              key={label}
              role="checkbox"
              aria-checked={on}
              aria-label={label}
              onPress={() => onToggle(item)}
              style={[styles.chip, on && styles.chipOn]}>
              {on && <CheckIcon />}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
        {!adding && (
          <Pressable accessibilityRole="button" onPress={onStartAdd} style={styles.addChip}>
            <Text style={styles.addChipText}>{category.id === 'events' ? '+ Eigenes Ereignis' : '+ Eigenes Symptom'}</Text>
          </Pressable>
        )}
      </View>
      {adding && (
        <View style={styles.addRow}>
          <TextInput
            value={newName}
            onChangeText={onChangeName}
            accessibilityLabel={category.id === 'events' ? 'Name für eigenes Ereignis' : 'Name für eigenes Symptom'}
            placeholder="Name eingeben"
            placeholderTextColor={colors.textMuted}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={onConfirmAdd}
            style={[styles.input, styles.addInput]}
          />
          <Pressable accessibilityRole="button" onPress={onConfirmAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>Hinzufügen</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 12, height: 12, borderRadius: 6 },
  cardTitle: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  chipTextOn: { color: colors.onPrimary },
  addChip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addChipText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.primary },
  addRow: { flexDirection: 'row', gap: 8 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.text,
  },
  addInput: { flex: 1, minWidth: 0 },
  addButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  addButtonText: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.onPrimary },
  weightRow: { flexDirection: 'row', alignItems: 'center' },
  weightInput: { width: 120, fontSize: 18, textAlign: 'right', marginLeft: 'auto' },
  unit: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.text },
  noteLabel: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  note: { minHeight: 110, paddingTop: 12, paddingBottom: 12 },
  footer: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 24, gap: 6 },
  msg: { fontFamily: fonts.bold, fontSize: 14, color: colors.text, textAlign: 'center' },
});
