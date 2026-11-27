import { describe, expect, it } from '@jest/globals';

import { escapeHtml, monthReportHtml, periodLabel, profileFacts, profileHtml } from '../pdf-html';
import type { DayEntry, Dog } from '../types';

const today = '2026-11-27';
const dog: Dog = {
  id: 'd', species: 'dog', name: 'Bella <3', birthday: '2022-03-14', breed: 'Labrador-Mischling',
  medication: '', foodType: 'Trockenfutter', foodAmount: '2 × 150 g', vet: { practice: 'Praxis Beispiel', address: 'Weg 1', phone: '000' },
  info: 'Verträgt kein Huhn.\nAngst bei Gewitter.', photo: '', createdAt: '', updatedAt: '',
};
const entry = (date: string, extra: Partial<DayEntry> = {}): DayEntry => ({
  id: date, dogId: 'd', date, items: [], weightKg: null, note: '', updatedAt: '', ...extra,
});

describe('PDF-Inhalte', () => {
  it('schützt Sonderzeichen', () => {
    expect(escapeHtml('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
  });

  it('Zeitraum: laufender Monat nur bis heute', () => {
    expect(periodLabel('2026-11', today)).toBe('1.11.–27.11.2026');
    expect(periodLabel('2026-10', today)).toBe('1.10.–31.10.2026');
  });

  it('Monatstabelle mit allen Angaben', () => {
    const html = monthReportHtml({
      dog, month: '2026-11', today,
      entries: [entry('2026-11-02', { items: [{ category: 'skin', label: 'Juckreiz' }], weightKg: 25, note: 'a<b' })],
    });
    expect(html).toContain('Bella &lt;3');
    expect(html).toContain('Labrador-Mischling · 4 Jahre');
    expect(html).toContain('Zeitraum: 1.11.–27.11.2026 · erstellt am 27.11.2026');
    expect(html).toContain('<th>Datum</th><th class="items">Ereignisse und Symptome</th><th>kg</th><th>Notiz</th>');
    expect(html).toContain('Haut &amp; Ohren: Juckreiz');
    expect(html).toContain('a&lt;b');
    expect(html).toContain('1 Tag mit Einträgen');
    expect(html).toContain('table-header-group');
  });

  it('leerer Monat', () => {
    expect(monthReportHtml({ dog, month: '2026-09', today, entries: [] })).toContain('Keine Einträge in diesem Zeitraum.');
  });

  it('Profil mit allen Feldern', () => {
    const facts = profileFacts(dog, today);
    expect(facts.map((f) => f.label)).toEqual([
      'Geburtstag', 'Alter', 'Rasse', 'Medikamente', 'Futterart', 'Futtermenge', 'Haustierarzt', 'Wichtige weitere Infos',
    ]);
    expect(facts.find((f) => f.label === 'Medikamente')?.value).toBe('–');
    expect(facts.find((f) => f.label === 'Haustierarzt')?.value).toBe('Praxis Beispiel\nWeg 1\nTel. 000');
    const html = profileHtml({ dog, today });
    expect(html).toContain('Verträgt kein Huhn.<br>Angst bei Gewitter.');
    expect(html).not.toContain('<img');
    expect(profileHtml({ dog: { ...dog, photo: 'data:image/jpeg;base64,AAA' }, today })).toContain('<img class="photo" src="data:image/jpeg;base64,AAA"');
  });
});
