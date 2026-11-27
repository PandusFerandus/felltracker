import { describe, expect, it } from '@jest/globals';

import {
  findExistingItem, formatWeight, itemsForCategory, parseWeight, prepareEntry, toggleItem,
} from '../entry-logic';
import type { CustomItem } from '../types';

const custom: CustomItem[] = [
  { id: '1', species: 'dog', category: 'skin', label: 'Kratzt am Hals', createdAt: '' },
];

describe('Gewicht', () => {
  it('nimmt Komma und Punkt', () => {
    expect(parseWeight('24,6')).toEqual({ ok: true, value: 24.6 });
    expect(parseWeight('24.6')).toEqual({ ok: true, value: 24.6 });
    expect(parseWeight(' 8 ')).toEqual({ ok: true, value: 8 });
    expect(parseWeight('0,5')).toEqual({ ok: true, value: 0.5 });
    expect(parseWeight('119,9')).toEqual({ ok: true, value: 119.9 });
  });

  it('leeres Feld heißt kein Gewicht', () => {
    expect(parseWeight('')).toEqual({ ok: true, value: null });
    expect(parseWeight('   ')).toEqual({ ok: true, value: null });
  });

  it('lehnt ungültige Werte ab', () => {
    for (const bad of ['0', '0,0', '120', '150', '-3', 'abc', '24,', ',5', '24,65', '1.000,5', '24 kg']) {
      expect(parseWeight(bad).ok).toBe(false);
    }
  });

  it('zeigt das Gewicht mit Komma', () => {
    expect(formatWeight(24.6)).toBe('24,6');
    expect(formatWeight(25)).toBe('25');
  });
});

describe('Punkte', () => {
  it('zeigt eigene Punkte nach dem Katalog', () => {
    const skin = itemsForCategory('dog', 'skin', custom);
    expect(skin[0]).toBe('Pfoten lecken');
    expect(skin[skin.length - 1]).toBe('Kratzt am Hals');
    expect(itemsForCategory('dog', 'digestion', custom)).not.toContain('Kratzt am Hals');
  });

  it('findet vorhandene Namen ohne Rücksicht auf Groß-/Kleinschreibung', () => {
    expect(findExistingItem('dog', 'juckreiz', custom)).toEqual({ category: 'skin', label: 'Juckreiz' });
    expect(findExistingItem('dog', '  KRATZT AM HALS ', custom)).toEqual({ category: 'skin', label: 'Kratzt am Hals' });
    expect(findExistingItem('dog', 'Impfung', custom)).toEqual({ category: 'events', label: 'Impfung' });
    expect(findExistingItem('dog', 'Neu', custom)).toBeNull();
  });

  it('schaltet Punkte an und aus', () => {
    const a = { category: 'skin' as const, label: 'Juckreiz' };
    const on = toggleItem([], a);
    expect(on).toEqual([a]);
    expect(toggleItem(on, a)).toEqual([]);
  });
});

describe('Speichern vorbereiten', () => {
  const ev = { category: 'events' as const, label: 'Impfung' };
  const sk = { category: 'skin' as const, label: 'Juckreiz' };

  it('speichert Punkte, Gewicht und Notiz', () => {
    expect(prepareEntry({ items: [sk], weight: '24,6', note: ' gut ' }, { future: false, exists: false })).toEqual({
      kind: 'save', items: [sk], weightKg: 24.6, note: 'gut',
    });
  });

  it('meldet ungültiges Gewicht', () => {
    expect(prepareEntry({ items: [sk], weight: '200', note: '' }, { future: false, exists: false }).kind).toBe('error');
  });

  it('löscht einen leer gespeicherten Eintrag', () => {
    expect(prepareEntry({ items: [], weight: '', note: '  ' }, { future: false, exists: true })).toEqual({ kind: 'delete' });
  });

  it('weist darauf hin, wenn ein neuer Eintrag leer ist', () => {
    expect(prepareEntry({ items: [], weight: '', note: '' }, { future: false, exists: false }).kind).toBe('error');
  });

  it('künftige Tage: nur Ereignisse und Notiz', () => {
    expect(prepareEntry({ items: [ev, sk], weight: '24,6', note: 'Kontrolle' }, { future: true, exists: false })).toEqual({
      kind: 'save', items: [ev], weightKg: null, note: 'Kontrolle',
    });
    expect(prepareEntry({ items: [sk], weight: '24,6', note: '' }, { future: true, exists: true })).toEqual({ kind: 'delete' });
  });
});
