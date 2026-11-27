import { longDate } from './dates';
import type { DateKey } from './types';

/** Zeile über den Einträgen des gewählten Tages, z. B. "Heute: noch kein Eintrag". */
export function dayStatus(day: DateKey, today: DateKey, hasEntry: boolean): string {
  const name = day === today ? 'Heute' : longDate(day, today);
  if (day > today) return `${name}: ${hasEntry ? 'geplant' : 'noch kein Termin'}`;
  return `${name}: ${hasEntry ? 'eingetragen' : 'noch kein Eintrag'}`;
}

/** Beschriftung des Hauptknopfs unten auf der Startseite. */
export function dayButtonLabel(day: DateKey, today: DateKey, hasEntry: boolean): string {
  if (day === today) return hasEntry ? 'Heutigen Tag bearbeiten' : 'Heutigen Tag eingeben';
  if (day > today) return hasEntry ? 'Termin bearbeiten' : 'Termin eintragen';
  return `${longDate(day, today)} ${hasEntry ? 'bearbeiten' : 'eingeben'}`;
}
