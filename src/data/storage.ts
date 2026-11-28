// Speicher-Schicht: Nur diese Datei weiß, wie und wo Daten liegen.
// Die Bildschirme benutzen ausschließlich das Interface `DataStore`.
// In Etappe 2 kommt eine zweite Umsetzung dazu, die mit dem Server abgleicht.

import { findExistingItem } from './entry-logic';
import type { AppSettings, CategoryId, CustomItem, DateKey, DayEntry, Dog, SelectedItem, Species } from './types';

export interface DataStore {
  listDogs(): Promise<Dog[]>;
  createDog(input: { name: string; species?: Species }): Promise<Dog>;
  updateDog(id: string, changes: Partial<Omit<Dog, 'id' | 'species' | 'createdAt' | 'updatedAt'>>): Promise<Dog>;

  /** Alle Tageseinträge eines Hundes, nach Datum (JJJJ-MM-TT) */
  listEntries(dogId: string): Promise<Record<DateKey, DayEntry>>;
  /** Legt den Eintrag an oder ersetzt ihn (höchstens einer je Hund und Datum). */
  saveEntry(dogId: string, date: DateKey, data: Pick<DayEntry, 'items' | 'weightKg' | 'note'>): Promise<DayEntry>;
  deleteEntry(dogId: string, date: DateKey): Promise<void>;

  listCustomItems(): Promise<CustomItem[]>;
  /**
   * Legt einen eigenen Punkt an. Gibt es den Namen schon (Groß-/Kleinschreibung egal),
   * wird nichts angelegt und der vorhandene Punkt zurückgegeben.
   */
  addCustomItem(input: { species?: Species; category: CategoryId; label: string }): Promise<{ item: SelectedItem; existed: boolean }>;

  getSettings(): Promise<AppSettings>;
  setActiveDog(id: string | null): Promise<void>;

  /** Löscht alle Daten dieser App auf dem Gerät. */
  clearAll(): Promise<void>;
}

/**
 * Erweiterter Zugriff für den Abgleich mit dem Server. Die Bildschirme nutzen das nicht.
 */
export interface LocalStore extends DataStore {
  /** Hund unverändert speichern (z. B. vom Server übernommen) */
  putDog(dog: Dog): Promise<void>;
  /** Hund samt Einträgen nur auf diesem Gerät entfernen */
  removeDogLocally(id: string): Promise<void>;
  /** Eintrag unverändert speichern (z. B. vom Server übernommen) */
  putEntry(entry: DayEntry): Promise<void>;
  removeEntryLocally(dogId: string, date: DateKey): Promise<void>;
  setCustomItems(items: CustomItem[]): Promise<void>;
  setMode(mode: AppSettings['mode']): Promise<void>;
  readJson<T>(name: string, fallback: T): Promise<T>;
  writeJson(name: string, value: unknown): Promise<void>;
}

/** Das Nötigste von AsyncStorage, damit Tests einen einfachen Ersatz nutzen können. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

const PREFIX = 'felltracker:v1:';
const KEYS = {
  dogs: `${PREFIX}dogs`,
  customItems: `${PREFIX}customItems`,
  settings: `${PREFIX}settings`,
  entries: (dogId: string) => `${PREFIX}entries:${dogId}`,
};

const DEFAULT_SETTINGS: AppSettings = { activeDogId: null };

export function createLocalStore(
  kv: KeyValueStorage,
  deps: { newId: () => string; now?: () => Date },
): LocalStore {
  const now = () => (deps.now ? deps.now() : new Date()).toISOString();

  async function read<T>(key: string, fallback: T): Promise<T> {
    const raw = await kv.getItem(key);
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
  const write = (key: string, value: unknown) => kv.setItem(key, JSON.stringify(value));

  return {
    async listDogs() {
      return read<Dog[]>(KEYS.dogs, []);
    },

    async createDog({ name, species = 'dog' }) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Name fehlt');
      const time = now();
      const dog: Dog = {
        id: deps.newId(),
        species,
        name: trimmed,
        birthday: '',
        breed: '',
        medication: '',
        foodType: '',
        foodAmount: '',
        vet: { practice: '', address: '', phone: '' },
        info: '',
        photo: '',
        createdAt: time,
        updatedAt: time,
      };
      const dogs = await read<Dog[]>(KEYS.dogs, []);
      await write(KEYS.dogs, [...dogs, dog]);
      return dog;
    },

    async updateDog(id, changes) {
      const dogs = await read<Dog[]>(KEYS.dogs, []);
      const index = dogs.findIndex((d) => d.id === id);
      if (index < 0) throw new Error('Hund nicht gefunden');
      const updated: Dog = { ...dogs[index], ...changes, id, updatedAt: now() };
      const next = [...dogs];
      next[index] = updated;
      await write(KEYS.dogs, next);
      return updated;
    },

    async listEntries(dogId) {
      return read<Record<DateKey, DayEntry>>(KEYS.entries(dogId), {});
    },

    async saveEntry(dogId, date, data) {
      const all = await read<Record<DateKey, DayEntry>>(KEYS.entries(dogId), {});
      const entry: DayEntry = {
        id: all[date]?.id ?? deps.newId(),
        dogId,
        date,
        items: data.items,
        weightKg: data.weightKg,
        note: data.note,
        updatedAt: now(),
      };
      await write(KEYS.entries(dogId), { ...all, [date]: entry });
      return entry;
    },

    async deleteEntry(dogId, date) {
      const all = await read<Record<DateKey, DayEntry>>(KEYS.entries(dogId), {});
      if (!(date in all)) return;
      const { [date]: _removed, ...rest } = all;
      await write(KEYS.entries(dogId), rest);
    },

    async listCustomItems() {
      return read<CustomItem[]>(KEYS.customItems, []);
    },

    async addCustomItem({ species = 'dog', category, label }) {
      const trimmed = label.trim().replace(/\s+/g, ' ');
      if (!trimmed) throw new Error('Name fehlt');
      const custom = await read<CustomItem[]>(KEYS.customItems, []);
      const existing = findExistingItem(species, trimmed, custom);
      if (existing) return { item: existing, existed: true };
      const item: CustomItem = { id: deps.newId(), species, category, label: trimmed, createdAt: now() };
      await write(KEYS.customItems, [...custom, item]);
      return { item: { category, label: trimmed }, existed: false };
    },

    async getSettings() {
      return { ...DEFAULT_SETTINGS, ...(await read<Partial<AppSettings>>(KEYS.settings, {})) };
    },

    async setActiveDog(id) {
      const settings = { ...DEFAULT_SETTINGS, ...(await read<Partial<AppSettings>>(KEYS.settings, {})) };
      await write(KEYS.settings, { ...settings, activeDogId: id });
    },

    async putDog(dog) {
      const dogs = await read<Dog[]>(KEYS.dogs, []);
      const index = dogs.findIndex((d) => d.id === dog.id);
      await write(KEYS.dogs, index < 0 ? [...dogs, dog] : dogs.map((d) => (d.id === dog.id ? dog : d)));
    },

    async removeDogLocally(id) {
      const dogs = await read<Dog[]>(KEYS.dogs, []);
      await write(KEYS.dogs, dogs.filter((d) => d.id !== id));
      await kv.removeItem(KEYS.entries(id));
    },

    async putEntry(entry) {
      const all = await read<Record<DateKey, DayEntry>>(KEYS.entries(entry.dogId), {});
      await write(KEYS.entries(entry.dogId), { ...all, [entry.date]: entry });
    },

    async removeEntryLocally(dogId, date) {
      const all = await read<Record<DateKey, DayEntry>>(KEYS.entries(dogId), {});
      if (!(date in all)) return;
      const { [date]: _removed, ...rest } = all;
      await write(KEYS.entries(dogId), rest);
    },

    async setCustomItems(items) {
      await write(KEYS.customItems, items);
    },

    async setMode(mode) {
      const settings = { ...DEFAULT_SETTINGS, ...(await read<Partial<AppSettings>>(KEYS.settings, {})) };
      await write(KEYS.settings, { ...settings, mode });
    },

    readJson: (name, fallback) => read(`${PREFIX}${name}`, fallback),
    writeJson: (name, value) => write(`${PREFIX}${name}`, value),

    async clearAll() {
      const keys = await kv.getAllKeys();
      for (const key of keys) {
        if (key.startsWith(PREFIX)) await kv.removeItem(key);
      }
    },
  };
}
