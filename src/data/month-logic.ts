import { catalogFor } from './catalog';
import { daysBetween, endOfMonth, MONTH_NAMES, startOfMonth, stripRange, fromDateKey } from './dates';
import type { CategoryId, DateKey, DayEntry, Species } from './types';

/** Monat als JJJJ-MM */
export type MonthKey = string;

export const monthOf = (day: DateKey): MonthKey => day.slice(0, 7);

export function monthName(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

export function shortMonthName(month: MonthKey): string {
  return MONTH_NAMES[Number(month.slice(5, 7)) - 1].slice(0, 3);
}

export function shiftMonth(month: MonthKey, by: number): MonthKey {
  return monthOf(startOfMonth(`${month}-01`, by));
}

/** Alle wählbaren Monate: wie die Kalenderleiste, optional nur bis zum aktuellen Monat. */
export function availableMonths(today: DateKey, entryDates: DateKey[], opts: { untilToday?: boolean } = {}): MonthKey[] {
  const { from, to } = stripRange(today, entryDates);
  const last = opts.untilToday ? monthOf(today) : monthOf(to);
  const out: MonthKey[] = [];
  for (let m = monthOf(from); m <= last; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

/** Tage eines Monats und Anzahl leerer Felder davor (Woche beginnt am Montag). */
export function monthGrid(month: MonthKey): { blanks: number; days: DateKey[] } {
  const first = `${month}-01`;
  const blanks = (fromDateKey(first).getDay() + 6) % 7;
  return { blanks, days: daysBetween(first, endOfMonth(first)) };
}

/** Welcher Tag wird beim Monatswechsel gewählt: heute, sonst letzter (Vergangenheit) bzw. erster Tag (Zukunft). */
export function defaultDayForMonth(month: MonthKey, today: DateKey): DateKey {
  if (month === monthOf(today)) return today;
  return month < monthOf(today) ? endOfMonth(`${month}-01`) : `${month}-01`;
}

/** Einträge eines Monats bis einschließlich heute, nach Datum sortiert. */
export function entriesInMonth(entries: Record<DateKey, DayEntry>, month: MonthKey, today: DateKey): DayEntry[] {
  return Object.values(entries)
    .filter((e) => monthOf(e.date) === month && e.date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export type ItemStat = { category: CategoryId; label: string; days: number; color: string };

/** "An wie vielen Tagen?": je Punkt die Anzahl Tage, häufigstes zuerst (bei Gleichstand Katalog-Reihenfolge). */
export function itemStats(species: Species, monthEntries: DayEntry[]): ItemStat[] {
  const catalog = catalogFor(species);
  const order = new Map(catalog.map((c, i) => [c.id, i]));
  const counts = new Map<string, ItemStat & { first: number }>();
  let seen = 0;
  for (const e of monthEntries) {
    const unique = new Map(e.items.map((i) => [`${i.category}\u0000${i.label}`, i]));
    for (const [key, i] of unique) {
      const s = counts.get(key);
      if (s) s.days += 1;
      else {
        const color = catalog.find((c) => c.id === i.category)?.color ?? '#4F6356';
        const base = catalog.find((c) => c.id === i.category)?.items.indexOf(i.label) ?? -1;
        counts.set(key, { ...i, days: 1, color, first: (order.get(i.category) ?? 9) * 10000 + (base < 0 ? 5000 + seen++ : base) });
      }
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.days - a.days || a.first - b.first)
    .map(({ first: _first, ...rest }) => rest);
}

export type WeightPoint = { date: DateKey; kg: number };

export function weightPoints(monthEntries: DayEntry[]): WeightPoint[] {
  return monthEntries.filter((e) => e.weightKg != null).map((e) => ({ date: e.date, kg: e.weightKg as number }));
}
