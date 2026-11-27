import { describe, expect, it } from '@jest/globals';

import {
  availableMonths, defaultDayForMonth, entriesInMonth, itemStats, monthGrid, monthName, shiftMonth,
  shortMonthName, weightPoints,
} from '../month-logic';
import type { DayEntry, SelectedItem } from '../types';

const today = '2026-11-27';
const e = (date: string, items: SelectedItem[], weightKg: number | null = null): DayEntry => ({
  id: date, dogId: 'd', date, items, weightKg, note: '', updatedAt: '',
});
const juck = { category: 'skin' as const, label: 'Juckreiz' };
const pfote = { category: 'skin' as const, label: 'Pfoten lecken' };
const impf = { category: 'events' as const, label: 'Impfung' };
const eigen = { category: 'skin' as const, label: 'Kratzt am Hals' };

describe('Monate', () => {
  it('Namen und Wechsel', () => {
    expect(monthName('2026-11')).toBe('November 2026');
    expect(shortMonthName('2026-03')).toBe('Mär');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('wählbare Monate', () => {
    const all = availableMonths(today, []);
    expect(all[0]).toBe('2025-11');
    expect(all[all.length - 1]).toBe('2027-05');
    expect(availableMonths(today, ['2024-06-01'], { untilToday: true }).slice(0, 1)).toEqual(['2024-06']);
    expect(availableMonths(today, [], { untilToday: true }).pop()).toBe('2026-11');
  });

  it('Monatsraster beginnt am Montag', () => {
    expect(monthGrid('2026-11').blanks).toBe(6); // 1.11.2026 ist ein Sonntag
    expect(monthGrid('2026-12').blanks).toBe(1); // Dienstag
    expect(monthGrid('2026-06').blanks).toBe(0); // Montag
    expect(monthGrid('2028-02').days).toHaveLength(29);
  });

  it('Tag beim Monatswechsel', () => {
    expect(defaultDayForMonth('2026-11', today)).toBe(today);
    expect(defaultDayForMonth('2026-10', today)).toBe('2026-10-31');
    expect(defaultDayForMonth('2027-01', today)).toBe('2027-01-01');
  });
});

describe('Verlauf', () => {
  const entries = {
    '2026-11-02': e('2026-11-02', [juck, pfote], 25),
    '2026-11-09': e('2026-11-09', [juck, eigen]),
    '2026-11-13': e('2026-11-13', [], 24.8),
    '2026-11-20': e('2026-11-20', [impf, juck], 24.7),
    '2026-11-30': e('2026-11-30', [juck], 30),
    '2026-10-30': e('2026-10-30', [juck], 25.1),
  };

  it('nimmt nur Tage des Monats bis heute', () => {
    expect(entriesInMonth(entries, '2026-11', today).map((x) => x.date)).toEqual(['2026-11-02', '2026-11-09', '2026-11-13', '2026-11-20']);
  });

  it('zählt Tage je Punkt, häufigstes zuerst', () => {
    const stats = itemStats('dog', entriesInMonth(entries, '2026-11', today));
    expect(stats.map((s) => [s.label, s.days])).toEqual([
      ['Juckreiz', 3],
      ['Impfung', 1],
      ['Pfoten lecken', 1],
      ['Kratzt am Hals', 1],
    ]);
    expect(stats[0].color).toBe('#B26B00');
  });

  it('zählt einen Punkt pro Tag nur einmal', () => {
    expect(itemStats('dog', [e('2026-11-01', [juck, juck])])[0].days).toBe(1);
  });

  it('Gewichtspunkte in Datumsreihenfolge', () => {
    expect(weightPoints(entriesInMonth(entries, '2026-11', today))).toEqual([
      { date: '2026-11-02', kg: 25 },
      { date: '2026-11-13', kg: 24.8 },
      { date: '2026-11-20', kg: 24.7 },
    ]);
  });
});
