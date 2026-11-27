import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { deviceStore } from './device-store';
import type { DataStore } from './storage';
import type { CustomItem, DateKey, DayEntry, Dog } from './types';

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
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children, store = deviceStore }: { children: ReactNode; store?: DataStore }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<DateKey, DayEntry>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);

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
    }),
    [loading, error, dogs, activeDogId, entries, customItems, createDog, selectDog],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData außerhalb von AppDataProvider');
  return ctx;
}
