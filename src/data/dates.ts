import type { DateKey } from './types';

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Lokales Datum eines Date-Objekts als JJJJ-MM-TT (keine Umrechnung nach UTC). */
export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** JJJJ-MM-TT als lokales Datum (12 Uhr mittags, damit Zeitumstellungen nichts verschieben). */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Erster Tag des Monats, um `months` Monate verschoben. */
export function startOfMonth(key: DateKey, months = 0): DateKey {
  const [y, m] = key.split('-').map(Number);
  return toDateKey(new Date(y, m - 1 + months, 1, 12));
}

/** Letzter Tag des Monats, um `months` Monate verschoben. */
export function endOfMonth(key: DateKey, months = 0): DateKey {
  const [y, m] = key.split('-').map(Number);
  return toDateKey(new Date(y, m + months, 0, 12));
}

/** Alle Tage von `from` bis einschließlich `to`. */
export function daysBetween(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/**
 * Tage der Kalenderleiste: mindestens 12 Monate zurück und 6 Monate voraus.
 * Gibt es ältere oder spätere Einträge, reicht die Leiste bis zu deren Monat.
 */
export function stripRange(today: DateKey, entryDates: DateKey[] = []): { from: DateKey; to: DateKey } {
  let from = startOfMonth(today, -12);
  let to = endOfMonth(today, 6);
  for (const d of entryDates) {
    if (d < from) from = startOfMonth(d);
    if (d > to) to = endOfMonth(d);
  }
  return { from, to };
}

export function monthYearLabel(key: DateKey): string {
  const d = fromDateKey(key);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** z. B. "3. Dezember", mit Jahr wenn es nicht das Jahr von `today` ist. */
export function longDate(key: DateKey, today: DateKey): string {
  const d = fromDateKey(key);
  const base = `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
  return key.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${d.getFullYear()}`;
}

/** Kurzname über der Zahl in der Kalenderleiste: "Heute", Monatsanfang ("Dez") oder Wochentag. */
export function stripLabel(key: DateKey, today: DateKey): string {
  if (key === today) return 'Heute';
  const d = fromDateKey(key);
  if (d.getDate() === 1) return MONTH_NAMES[d.getMonth()].slice(0, 3);
  return WEEKDAYS[d.getDay()];
}

/** Alter aus Geburtstag, z. B. "4 Monate", "1 Jahr", "4 Jahre". Leer, wenn unbekannt oder in der Zukunft. */
export function ageLabel(birthday: DateKey | '', today: DateKey): string {
  if (!birthday || !isDateKey(birthday)) return '';
  const [by, bm, bd] = birthday.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  if (months < 0) return '';
  if (months < 12) return `${months} ${months === 1 ? 'Monat' : 'Monate'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
}

/** "2022-03-14" → "14.03.2022" */
export function formatGermanDate(key: DateKey | ''): string {
  if (!key || !isDateKey(key)) return '';
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

export type BirthdayResult = { ok: true; value: DateKey | '' } | { ok: false; message: string };

/** Liest einen Geburtstag wie "14.3.2022" oder "14.03.2022". Leer ist erlaubt, Zukunft nicht. */
export function parseBirthday(text: string, today: DateKey): BirthdayResult {
  const raw = text.trim();
  if (raw === '') return { ok: true, value: '' };
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(raw);
  if (!m) return { ok: false, message: 'Bitte gib den Geburtstag so ein: TT.MM.JJJJ, z. B. 14.03.2022.' };
  const key = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (!isDateKey(key)) return { ok: false, message: 'Diesen Tag gibt es nicht. Bitte prüfe den Geburtstag.' };
  if (key > today) return { ok: false, message: 'Der Geburtstag darf nicht in der Zukunft liegen.' };
  if (key < '1980-01-01') return { ok: false, message: 'Bitte prüfe das Jahr des Geburtstags.' };
  return { ok: true, value: key };
}
