import { describe, expect, it } from '@jest/globals';

import {
  addDays, ageLabel, daysBetween, endOfMonth, fromDateKey, isDateKey, longDate, monthYearLabel,
  startOfMonth, stripLabel, stripRange, toDateKey,
} from '../dates';

describe('Datumshilfen', () => {
  it('speichert das lokale Datum ohne Zeitzonen-Verschiebung', () => {
    expect(toDateKey(new Date(2026, 10, 27, 0, 5))).toBe('2026-11-27');
    expect(toDateKey(new Date(2026, 10, 27, 23, 55))).toBe('2026-11-27');
    expect(toDateKey(fromDateKey('2026-03-29'))).toBe('2026-03-29');
  });

  it('zählt Tage über Monats-, Jahreswechsel und Zeitumstellung', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('kennt Monatsanfang und -ende', () => {
    expect(startOfMonth('2026-11-27', -12)).toBe('2025-11-01');
    expect(endOfMonth('2026-11-27', 6)).toBe('2027-05-31');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
  });

  it('prüft das Datumsformat', () => {
    expect(isDateKey('2026-11-27')).toBe(true);
    expect(isDateKey('2026-02-30')).toBe(false);
    expect(isDateKey('27.11.2026')).toBe(false);
  });

  it('listet alle Tage eines Zeitraums', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('Kalenderleiste: 12 Monate zurück, 6 voraus, ältere Einträge bleiben erreichbar', () => {
    expect(stripRange('2026-11-27')).toEqual({ from: '2025-11-01', to: '2027-05-31' });
    expect(stripRange('2026-11-27', ['2024-02-14', '2026-11-01'])).toEqual({ from: '2024-02-01', to: '2027-05-31' });
    expect(stripRange('2026-11-27', ['2027-09-03'])).toEqual({ from: '2025-11-01', to: '2027-09-30' });
    const days = daysBetween('2025-11-01', '2027-05-31');
    expect(days).toContain('2026-11-27');
  });

  it('beschriftet Tage', () => {
    expect(monthYearLabel('2026-11-27')).toBe('November 2026');
    expect(longDate('2026-12-03', '2026-11-27')).toBe('3. Dezember');
    expect(longDate('2027-01-03', '2026-11-27')).toBe('3. Januar 2027');
    expect(stripLabel('2026-11-27', '2026-11-27')).toBe('Heute');
    expect(stripLabel('2026-12-01', '2026-11-27')).toBe('Dez');
    expect(stripLabel('2026-11-26', '2026-11-27')).toBe('Do');
  });

  it('berechnet das Alter', () => {
    expect(ageLabel('', '2026-11-27')).toBe('');
    expect(ageLabel('2022-03-14', '2026-11-27')).toBe('4 Jahre');
    expect(ageLabel('2025-11-27', '2026-11-27')).toBe('1 Jahr');
    expect(ageLabel('2025-11-28', '2026-11-27')).toBe('11 Monate');
    expect(ageLabel('2026-10-27', '2026-11-27')).toBe('1 Monat');
    expect(ageLabel('2026-11-20', '2026-11-27')).toBe('0 Monate');
    expect(ageLabel('2026-12-01', '2026-11-27')).toBe('');
  });
});
