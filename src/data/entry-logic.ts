import { catalogFor } from './catalog';
import type { CategoryId, CustomItem, SelectedItem, Species } from './types';

export type WeightResult = { ok: true; value: number | null } | { ok: false; message: string };

/**
 * Liest das Gewicht aus dem Eingabefeld. Komma oder Punkt, größer 0 und kleiner 120,
 * höchstens eine Nachkommastelle. Ein leeres Feld bedeutet: kein Gewicht.
 */
export function parseWeight(text: string): WeightResult {
  const raw = text.trim().replace(/\s/g, '').replace(',', '.');
  if (raw === '') return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(raw)) return { ok: false, message: 'Bitte gib das Gewicht als Zahl ein, z. B. 24,6.' };
  if (/\.\d{2,}$/.test(raw)) return { ok: false, message: 'Bitte nur eine Stelle nach dem Komma, z. B. 24,6.' };
  const value = Number(raw);
  if (!(value > 0 && value < 120)) return { ok: false, message: 'Das Gewicht muss größer als 0 und kleiner als 120 kg sein.' };
  return { ok: true, value: Math.round(value * 10) / 10 };
}

/** 24.6 → "24,6" */
export function formatWeight(kg: number): string {
  return String(Math.round(kg * 10) / 10).replace('.', ',');
}

/** Alle Punkte einer Kategorie zum Antippen: zuerst der feste Katalog, dann eigene Punkte. */
export function itemsForCategory(species: Species, category: CategoryId, custom: CustomItem[]): string[] {
  const base = catalogFor(species).find((c) => c.id === category)?.items ?? [];
  const own = custom.filter((c) => c.species === species && c.category === category).map((c) => c.label);
  return [...base, ...own];
}

/**
 * Sucht einen vorhandenen Punkt mit gleichem Namen (Groß-/Kleinschreibung egal),
 * in allen Kategorien, im Katalog und bei den eigenen Punkten.
 */
export function findExistingItem(species: Species, label: string, custom: CustomItem[]): SelectedItem | null {
  const wanted = label.trim().toLocaleLowerCase('de');
  if (!wanted) return null;
  for (const c of catalogFor(species)) {
    for (const l of itemsForCategory(species, c.id, custom)) {
      if (l.toLocaleLowerCase('de') === wanted) return { category: c.id, label: l };
    }
  }
  return null;
}

export const sameItem = (a: SelectedItem, b: SelectedItem) => a.category === b.category && a.label === b.label;

export function toggleItem(items: SelectedItem[], item: SelectedItem): SelectedItem[] {
  return items.some((i) => sameItem(i, item)) ? items.filter((i) => !sameItem(i, item)) : [...items, item];
}

export type Draft = { items: SelectedItem[]; weight: string; note: string };

export type PreparedEntry =
  | { kind: 'save'; items: SelectedItem[]; weightKg: number | null; note: string }
  | { kind: 'delete' }
  | { kind: 'error'; message: string };

/**
 * Bereitet das Speichern vor. Bei künftigen Tagen zählen nur Ereignisse und die Notiz.
 * Ein leerer Eintrag wird gelöscht; gab es noch keinen, kommt ein Hinweis.
 */
export function prepareEntry(draft: Draft, opts: { future: boolean; exists: boolean }): PreparedEntry {
  const items = opts.future ? draft.items.filter((i) => i.category === 'events') : draft.items;
  let weightKg: number | null = null;
  if (!opts.future) {
    const w = parseWeight(draft.weight);
    if (!w.ok) return { kind: 'error', message: w.message };
    weightKg = w.value;
  }
  const note = draft.note.trim();
  if (items.length === 0 && weightKg == null && note === '') {
    return opts.exists ? { kind: 'delete' } : { kind: 'error', message: 'Bitte tippe erst etwas an oder gib etwas ein.' };
  }
  return { kind: 'save', items, weightKg, note };
}
