import { describe, expect, it } from '@jest/globals';

import { dayButtonLabel, dayStatus } from '../day-labels';

const today = '2026-11-27';

describe('Beschriftungen der Startseite', () => {
  it('Hauptknopf', () => {
    expect(dayButtonLabel(today, today, false)).toBe('Heutigen Tag eingeben');
    expect(dayButtonLabel(today, today, true)).toBe('Heutigen Tag bearbeiten');
    expect(dayButtonLabel('2026-12-03', today, false)).toBe('Termin eintragen');
    expect(dayButtonLabel('2026-12-03', today, true)).toBe('Termin bearbeiten');
    expect(dayButtonLabel('2026-11-20', today, false)).toBe('20. November eingeben');
    expect(dayButtonLabel('2025-12-24', today, true)).toBe('24. Dezember 2025 bearbeiten');
  });

  it('Status des Tages', () => {
    expect(dayStatus(today, today, false)).toBe('Heute: noch kein Eintrag');
    expect(dayStatus(today, today, true)).toBe('Heute: eingetragen');
    expect(dayStatus('2026-12-03', today, false)).toBe('3. Dezember: noch kein Termin');
    expect(dayStatus('2026-12-03', today, true)).toBe('3. Dezember: geplant');
  });
});
