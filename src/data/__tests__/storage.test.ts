import { beforeEach, describe, expect, it } from '@jest/globals';

import { categoriesOf, catalogFor, itemLines } from '../catalog';
import { createLocalStore, type DataStore, type KeyValueStorage } from '../storage';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
    getAllKeys: async () => [...data.keys()],
  };
}

describe('Speicher-Schicht', () => {
  let kv: ReturnType<typeof memoryStorage>;
  let store: DataStore;
  let counter: number;

  beforeEach(() => {
    kv = memoryStorage();
    counter = 0;
    store = createLocalStore(kv, {
      newId: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`,
      now: () => new Date('2026-11-27T10:00:00Z'),
    });
  });

  it('startet leer', async () => {
    expect(await store.listDogs()).toEqual([]);
    expect(await store.getSettings()).toEqual({ activeDogId: null });
    expect(await store.listCustomItems()).toEqual([]);
  });

  it('legt einen Hund mit Namen an', async () => {
    const dog = await store.createDog({ name: '  Bella ' });
    expect(dog.name).toBe('Bella');
    expect(dog.species).toBe('dog');
    expect(dog.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await store.listDogs()).toEqual([dog]);
  });

  it('lehnt einen leeren Namen ab', async () => {
    await expect(store.createDog({ name: '   ' })).rejects.toThrow();
    expect(await store.listDogs()).toEqual([]);
  });

  it('merkt sich den ausgewählten Hund', async () => {
    const a = await store.createDog({ name: 'A' });
    const b = await store.createDog({ name: 'B' });
    await store.setActiveDog(b.id);
    expect((await store.getSettings()).activeDogId).toBe(b.id);
    await store.setActiveDog(a.id);
    expect((await store.getSettings()).activeDogId).toBe(a.id);
  });

  it('ändert Angaben zum Hund', async () => {
    const dog = await store.createDog({ name: 'Bella' });
    const updated = await store.updateDog(dog.id, { breed: 'Beagle', birthday: '2022-03-14' });
    expect(updated.breed).toBe('Beagle');
    expect((await store.listDogs())[0].birthday).toBe('2022-03-14');
  });

  it('hat höchstens einen Eintrag je Hund und Datum', async () => {
    const dog = await store.createDog({ name: 'Bella' });
    const first = await store.saveEntry(dog.id, '2026-11-27', { items: [{ category: 'skin', label: 'Juckreiz' }], weightKg: 24.6, note: '' });
    const second = await store.saveEntry(dog.id, '2026-11-27', { items: [], weightKg: 24.7, note: 'x' });
    expect(second.id).toBe(first.id);
    const all = await store.listEntries(dog.id);
    expect(Object.keys(all)).toEqual(['2026-11-27']);
    expect(all['2026-11-27'].weightKg).toBe(24.7);
  });

  it('trennt Einträge verschiedener Hunde und löscht einzeln', async () => {
    const a = await store.createDog({ name: 'A' });
    const b = await store.createDog({ name: 'B' });
    await store.saveEntry(a.id, '2026-11-27', { items: [], weightKg: 10, note: '' });
    await store.saveEntry(b.id, '2026-11-27', { items: [], weightKg: 20, note: '' });
    await store.deleteEntry(a.id, '2026-11-27');
    expect(await store.listEntries(a.id)).toEqual({});
    expect(Object.keys(await store.listEntries(b.id))).toEqual(['2026-11-27']);
  });

  it('löscht beim Zurücksetzen nur eigene Daten', async () => {
    await kv.setItem('fremde-app', '1');
    const dog = await store.createDog({ name: 'Bella' });
    await store.setActiveDog(dog.id);
    await store.clearAll();
    expect(await store.listDogs()).toEqual([]);
    expect(kv.data.get('fremde-app')).toBe('1');
  });

  it('kommt mit kaputten Daten zurecht', async () => {
    await kv.setItem('felltracker:v1:dogs', '{kaputt');
    expect(await store.listDogs()).toEqual([]);
  });
});

describe('Punktekatalog', () => {
  it('hat vier Kategorien für Hunde', () => {
    expect(catalogFor('dog').map((c) => c.id)).toEqual(['events', 'skin', 'digestion', 'joints']);
  });

  it('ordnet Punkte den Kategorien zu', () => {
    const items = [
      { category: 'joints' as const, label: 'Humpeln' },
      { category: 'skin' as const, label: 'Juckreiz' },
      { category: 'skin' as const, label: 'Pfoten lecken' },
    ];
    expect(categoriesOf('dog', items).map((c) => c.id)).toEqual(['skin', 'joints']);
    expect(itemLines('dog', items)).toEqual(['Haut & Ohren: Juckreiz, Pfoten lecken', 'Gelenke & Muskeln: Humpeln']);
  });
});
