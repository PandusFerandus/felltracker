import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deviceStore } from './device-store';
import type { DataStore } from './storage';
import type { Draft } from './entry-logic';
import { prepareEntry } from './entry-logic';
import type { CategoryId, CustomItem, DateKey, DayEntry, Dog, SelectedItem } from './types';

type AppData = {
  loading: boolean;
  /** Fehlermeldung, falls die Daten nicht geladen werden konnten */
  error: string | null;
  dogs: Dog[];
  activeDog: Dog | null;
  /** Tageseinträge des ausgewählten Hundes */
  entries: Record<DateKey, DayEntry>;
  customItems: CustomItem[];
  createDog(name: string): Promise<Dog>;
  selectDog(id: string): Promise<void>;
  /**
   * Speichert den Tag des ausgewählten Hundes. Ein leerer Eintrag wird gelöscht.
   * Ergebnis: 'saved', 'deleted' oder eine Fehlermeldung.
   */
  saveDay(date: DateKey, draft: Draft, future: boolean): Promise<{ result: 'saved' | 'deleted' } | { error: string }>;
  addCustomItem(category: CategoryId, label: string): Promise<{ item: SelectedItem; existed: boolean }>;
  updateDog(id: string, changes: Partial<Omit<Dog, 'id' | 'species' | 'createdAt' | 'updatedAt'>>): Promise<Dog>;
  /** Löscht alle Daten auf diesem Gerät. */
  deleteAllData(): Promise<void>;
  /** Kurze Meldung für die Startseite, z. B. nach dem Speichern */
  flash: string | null;
  setFlash(msg: string | null): void;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children, store = deviceStore }: { children: ReactNode; store?: DataStore }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<DateKey, DayEntry>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [loadedDogs, settings, custom] = await Promise.all([
          store.listDogs(),
          store.getSettings(),
          store.listCustomItems(),
        ]);
        const active = loadedDogs.find((d) => d.id === settings.activeDogId) ?? loadedDogs[0] ?? null;
        const loadedEntries = active ? await store.listEntries(active.id) : {};
        if (cancelled) return;
        setDogs(loadedDogs);
        setActiveDogId(active?.id ?? null);
        setEntries(loadedEntries);
        setCustomItems(custom);
      } catch {
        if (!cancelled) setError('Deine Daten konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const selectDog = useCallback(
    async (id: string) => {
      await store.setActiveDog(id);
      const loadedEntries = await store.listEntries(id);
      setActiveDogId(id);
      setEntries(loadedEntries);
    },
    [store],
  );

  const createDog = useCallback(
    async (name: string) => {
      const dog = await store.createDog({ name });
      setDogs((prev) => [...prev, dog]);
      await store.setActiveDog(dog.id);
      setActiveDogId(dog.id);
      setEntries({});
      return dog;
    },
    [store],
  );

  const saveDay = useCallback<AppData['saveDay']>(
    async (date, draft, future) => {
      if (!activeDogId) return { error: 'Kein Hund ausgewählt.' };
      const prepared = prepareEntry(draft, { future, exists: date in entries });
      if (prepared.kind === 'error') return { error: prepared.message };
      if (prepared.kind === 'delete') {
        await store.deleteEntry(activeDogId, date);
        setEntries((prev) => {
          const { [date]: _removed, ...rest } = prev;
          return rest;
        });
        return { result: 'deleted' };
      }
      const saved = await store.saveEntry(activeDogId, date, prepared);
      setEntries((prev) => ({ ...prev, [date]: saved }));
      return { result: 'saved' };
    },
    [store, activeDogId, entries],
  );

  const addCustomItem = useCallback<AppData['addCustomItem']>(
    async (category, label) => {
      const res = await store.addCustomItem({ category, label });
      if (!res.existed) setCustomItems(await store.listCustomItems());
      return res;
    },
    [store],
  );

  const updateDog = useCallback<AppData['updateDog']>(
    async (id, changes) => {
      const updated = await store.updateDog(id, changes);
      setDogs((prev) => prev.map((d) => (d.id === id ? updated : d)));
      return updated;
    },
    [store],
  );

  const deleteAllData = useCallback(async () => {
    await store.clearAll();
    setDogs([]);
    setActiveDogId(null);
    setEntries({});
    setCustomItems([]);
    setFlash(null);
  }, [store]);

  const value = useMemo<AppData>(
    () => ({
      loading,
      error,
      dogs,
      activeDog: dogs.find((d) => d.id === activeDogId) ?? null,
      entries,
      customItems,
      createDog,
      selectDog,
      saveDay,
      addCustomItem,
      updateDog,
      deleteAllData,
      flash,
      setFlash,
    }),
    [loading, error, dogs, activeDogId, entries, customItems, createDog, selectDog, saveDay, addCustomItem, updateDog, deleteAllData, flash],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData außerhalb von AppDataProvider');
  return ctx;
}
