import { memo, useCallback, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { categoriesOf } from '@/data/catalog';
import { daysBetween, longDate, stripLabel, stripRange } from '@/data/dates';
import type { DateKey, DayEntry, Species } from '@/data/types';
import { colors, fonts } from '@/theme';

const DAY_WIDTH = 48;
const GAP = 6;
const STEP = DAY_WIDTH + GAP;
const SIDE = 16;

type Props = {
  today: DateKey;
  selected: DateKey;
  entries: Record<DateKey, DayEntry>;
  species: Species;
  onSelect(day: DateKey): void;
};

/** Seitlich scrollbare Kalenderleiste. Beim Öffnen steht heute in der Mitte. */
export function DayStrip({ today, selected, entries, species, onSelect }: Props) {
  const listRef = useRef<FlatList<DateKey>>(null);
  const centered = useRef(false);

  const extraData = useMemo(() => ({ selected, entries }), [selected, entries]);
  const entryDates = useMemo(() => Object.keys(entries), [entries]);
  const days = useMemo(() => {
    const { from, to } = stripRange(today, entryDates);
    return daysBetween(from, to);
  }, [today, entryDates]);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (centered.current) return;
      const width = e.nativeEvent.layout.width;
      const index = days.indexOf(today);
      if (width <= 0 || index < 0) return;
      centered.current = true;
      const offset = Math.max(0, SIDE + index * STEP + DAY_WIDTH / 2 - width / 2);
      // Kurz warten, bis die Liste bereit ist, dann ohne Animation hinspringen.
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset, animated: false }));
    },
    [days, today],
  );

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={days}
      keyExtractor={(d) => d}
      accessibilityLabel="Kalenderleiste, seitlich scrollen"
      showsHorizontalScrollIndicator={false}
      onLayout={onLayout}
      style={styles.list}
      contentContainerStyle={styles.content}
      getItemLayout={(_, index) => ({ length: STEP, offset: SIDE - GAP / 2 + index * STEP, index })}
      initialNumToRender={14}
      windowSize={7}
      extraData={extraData}
      renderItem={({ item }) => (
        <StripDay
          day={item}
          today={today}
          selected={item === selected}
          entry={entries[item]}
          species={species}
          onSelect={onSelect}
        />
      )}
    />
  );
}

type DayProps = {
  day: DateKey;
  today: DateKey;
  selected: boolean;
  entry: DayEntry | undefined;
  species: Species;
  onSelect(day: DateKey): void;
};

const StripDay = memo(function StripDay({ day, today, selected, entry, species, onSelect }: DayProps) {
  const dots = entry ? categoriesOf(species, entry.items) : [];
  const future = day > today;
  const bg = selected ? colors.surfaceLight : colors.card;
  return (
    <View style={styles.cell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${day === today ? 'Heute, ' : ''}${longDate(day, today)}, ${entry ? 'mit Eintrag' : 'ohne Eintrag'}`}
        aria-selected={selected}
        onPress={() => onSelect(day)}
        style={[styles.day, { backgroundColor: bg, borderColor: selected ? colors.primary : bg }]}>
        <Text style={[styles.label, future && styles.future]}>{stripLabel(day, today)}</Text>
        <Text style={[styles.number, future && styles.future]}>{Number(day.slice(8))}</Text>
        <View style={styles.dots}>
          {dots.map((c) => (
            <View key={c.id} style={[styles.dot, { backgroundColor: c.color }]} />
          ))}
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: SIDE - GAP / 2,
    paddingTop: 2,
    paddingBottom: 10,
  },
  cell: {
    width: STEP,
    paddingHorizontal: GAP / 2,
  },
  day: {
    width: DAY_WIDTH,
    height: 76,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
  },
  number: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: colors.text,
  },
  future: {
    color: '#5F7066',
  },
  dots: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
