import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { accountsEnabled } from '@/config';
import { supabase } from '@/lib/supabase';

import { authMessage, isEmailNotConfirmed } from './auth-messages';
import { deviceStore } from './device-store';
import type { Draft } from './entry-logic';
import { prepareEntry } from './entry-logic';
import type { Invite } from './remote';
import * as server from './remote-supabase';
import type { LocalStore } from './storage';
import { enqueue, enqueueEverything, readOutbox, readSyncState, syncOnce, type Op } from './sync';
import type { CategoryId, CustomItem, DateKey, DayEntry, Dog, SelectedItem } from './types';

export type Mode = 'unset' | 'guest' | 'account';
export type Account = { id: string; email: string; name: string };
export type AuthResult = { ok: true } | { needsCode: true } | { error: string };
export type SyncInfo = { syncing: boolean; pending: number; lastSyncAt: string | null; offline: boolean };

type AppData = {
  loading: boolean;
  /** Fehlermeldung, falls die Daten nicht geladen werden konnten */
  error: string | null;
  mode: Mode;
  account: Account | null;
  /** Mit Konto: noch kein erster Abgleich (z. B. direkt nach dem Anmelden) */
  waitingForFirstSync: boolean;
  /** Nach dem Anmelden: Es gibt Daten ohne Konto auf diesem Gerät – übernehmen? */
  guestDataQuestion: boolean;
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
  /** Ohne Konto: löscht alle Daten auf diesem Gerät. */
  deleteAllData(): Promise<void>;
  /** Kurze Meldung für die Startseite, z. B. nach dem Speichern */
  flash: string | null;
  setFlash(msg: string | null): void;

  // Konto
  startGuest(): Promise<void>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(name: string, email: string, password: string): Promise<AuthResult>;
  verifyCode(email: string, code: string, type: 'signup' | 'recovery'): Promise<AuthResult>;
  resendCode(email: string, type: 'signup' | 'recovery'): Promise<AuthResult>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  setNewPassword(password: string): Promise<AuthResult>;
  answerGuestData(take: boolean): Promise<void>;
  /** Abmelden. Gibt es noch nicht übertragene Änderungen, nur mit force. */
  signOut(force?: boolean): Promise<{ ok: true } | { pending: number }>;
  deleteAccount(): Promise<{ ok: true } | { error: string }>;

  // Abgleich und Einladungen
  sync: SyncInfo;
  syncNow(): Promise<void>;
  /** Hinweise, z. B. wenn eine neuere Änderung von einem anderen Gerät übernommen wurde */
  notices: string[];
  dismissNotices(): void;
  invites: Invite[];
  refreshInvites(): Promise<void>;
  acceptInvite(id: string): Promise<{ ok: true } | { error: string }>;
  declineInvite(id: string): Promise<{ ok: true } | { error: string }>;
};

const AppDataContext = createContext<AppData | null>(null);

const SYNC_INTERVAL_MS = 60_000;
const SYNC_DEBOUNCE_MS = 1500;

export function AppDataProvider({ children, store = deviceStore }: { children: ReactNode; store?: LocalStore }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('unset');
  const [account, setAccount] = useState<Account | null>(null);
  const [waitingForFirstSync, setWaitingForFirstSync] = useState(false);
  const [guestDataQuestion, setGuestDataQuestion] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [activeDogId, setActiveDogId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<DateKey, DayEntry>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncInfo>({ syncing: false, pending: 0, lastSyncAt: null, offline: false });
  const [notices, setNotices] = useState<string[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const accountRef = useRef<Account | null>(null);
  accountRef.current = account;
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeDogId;
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Lädt alles aus dem Gerätespeicher neu in die Anzeige. */
  const reloadLocal = useCallback(async () => {
    const [loadedDogs, settings, custom, outbox, syncState] = await Promise.all([
      store.listDogs(),
      store.getSettings(),
      store.listCustomItems(),
      readOutbox(store),
      readSyncState(store),
    ]);
    const wanted = activeRef.current ?? settings.activeDogId;
    const active = loadedDogs.find((d) => d.id === wanted) ?? loadedDogs[0] ?? null;
    const loadedEntries = active ? await store.listEntries(active.id) : {};
    setDogs(loadedDogs);
    setActiveDogId(active?.id ?? null);
    setEntries(loadedEntries);
    setCustomItems(custom);
    setSync((s) => ({ ...s, pending: outbox.length, lastSyncAt: syncState.lastSyncAt }));
  }, [store]);

  const refreshInvites = useCallback(async () => {
    if (!accountRef.current) return;
    try {
      setInvites(await server.myInvites());
    } catch {
      // ohne Verbindung: später erneut
    }
  }, []);

  /** Ein Abgleich mit dem Server (nur mit Konto). Läuft nie doppelt. */
  const runSync = useCallback(async () => {
    const acc = accountRef.current;
    if (!acc) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    setSync((s) => ({ ...s, syncing: true }));
    try {
      do {
        syncAgain.current = false;
        try {
          const res = await syncOnce(store, server.supabaseRemote, acc.id);
          if (res.notices.length) setNotices((n) => [...n, ...res.notices]);
          setSync((s) => ({ ...s, offline: false }));
        } catch {
          setSync((s) => ({ ...s, offline: true }));
          syncAgain.current = false;
        }
        await reloadLocal();
      } while (syncAgain.current && accountRef.current);
      await refreshInvites();
    } finally {
      syncing.current = false;
      setWaitingForFirstSync(false);
      setSync((s) => ({ ...s, syncing: false }));
    }
  }, [store, reloadLocal, refreshInvites]);

  /** Änderung vormerken und den Abgleich kurz danach starten. */
  const markChanged = useCallback(
    async (ops: Op[]) => {
      if (!accountRef.current) return;
      await enqueue(store, ops);
      setSync((s) => ({ ...s, pending: s.pending + ops.length }));
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void runSync(), SYNC_DEBOUNCE_MS);
    },
    [store, runSync],
  );

  /** Konto aktiv schalten (nach Anmeldung oder beim Start mit gespeicherter Anmeldung). */
  const enterAccount = useCallback(
    async (acc: Account, opts: { newAccount: boolean; askAboutGuestData: boolean }) => {
      const localDogs = await store.listDogs();
      const guestDogs = localDogs.filter((d) => !d.ownerId);
      setAccount(acc);
      accountRef.current = acc;
      if (guestDogs.length > 0 && opts.askAboutGuestData && !opts.newAccount) {
        setGuestDataQuestion(true);
        setMode('account');
        return;
      }
      if (guestDogs.length > 0 && opts.newAccount) {
        await enqueueEverything(store);
        setFlash('Deine bisherigen Einträge werden in dein Konto übernommen.');
      }
      await store.setMode('account');
      setMode('account');
      setWaitingForFirstSync(localDogs.length === 0);
      await reloadLocal();
      void runSync();
    },
    [store, reloadLocal, runSync],
  );

  // Start: gespeicherte Daten und Anmeldung laden
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await store.getSettings();
        await reloadLocal();
        const localDogs = await store.listDogs();
        const { data } = accountsEnabled ? await supabase.auth.getSession() : { data: { session: null } };
        const user = data.session?.user;
        if (cancelled) return;
        if (user) {
          await enterAccount(
            { id: user.id, email: user.email ?? '', name: (user.user_metadata?.display_name as string) ?? '' },
            { newAccount: false, askAboutGuestData: true },
          );
        } else if (settings.mode === 'guest' || (settings.mode !== 'account' && localDogs.length > 0)) {
          setMode('guest');
          if (settings.mode !== 'guest') await store.setMode('guest');
        } else {
          setMode('unset');
        }
      } catch {
        if (!cancelled) setError('Deine Daten konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store, reloadLocal, enterAccount]);

  // Regelmäßig abgleichen, solange die App offen ist, und beim Zurückkehren in die App
  useEffect(() => {
    if (mode !== 'account' || guestDataQuestion) return;
    const timer = setInterval(() => void runSync(), SYNC_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void runSync();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [mode, guestDataQuestion, runSync]);

  // Läuft die Anmeldung ab oder wird sie woanders beendet: zurück zur Anmeldung.
  useEffect(() => {
    if (!accountsEnabled) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && accountRef.current) {
        void (async () => {
          setAccount(null);
          accountRef.current = null;
          setMode('unset');
          await store.setMode(undefined);
        })();
      }
    });
    return () => data.subscription.unsubscribe();
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
      let dog = await store.createDog({ name });
      if (accountRef.current) {
        dog = { ...dog, ownerId: accountRef.current.id };
        await store.putDog(dog);
      }
      setDogs((prev) => [...prev, dog]);
      await store.setActiveDog(dog.id);
      setActiveDogId(dog.id);
      setEntries({});
      await markChanged([{ kind: 'dog', id: dog.id }]);
      return dog;
    },
    [store, markChanged],
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
        await markChanged([{ kind: 'entry', dogId: activeDogId, date, at: new Date().toISOString() }]);
        return { result: 'deleted' };
      }
      const saved = await store.saveEntry(activeDogId, date, prepared);
      setEntries((prev) => ({ ...prev, [date]: saved }));
      await markChanged([{ kind: 'entry', dogId: activeDogId, date, at: saved.updatedAt }]);
      return { result: 'saved' };
    },
    [store, activeDogId, entries, markChanged],
  );

  const addCustomItem = useCallback<AppData['addCustomItem']>(
    async (category, label) => {
      const res = await store.addCustomItem({ category, label });
      if (!res.existed) {
        const list = await store.listCustomItems();
        setCustomItems(list);
        const created = list.find((c) => c.label === res.item.label && c.category === res.item.category);
        if (created) await markChanged([{ kind: 'custom', id: created.id }]);
      }
      return res;
    },
    [store, markChanged],
  );

  const updateDog = useCallback<AppData['updateDog']>(
    async (id, changes) => {
      const updated = await store.updateDog(id, changes);
      setDogs((prev) => prev.map((d) => (d.id === id ? updated : d)));
      await markChanged([{ kind: 'dog', id }]);
      return updated;
    },
    [store, markChanged],
  );

  const resetLocalState = useCallback(() => {
    setDogs([]);
    setActiveDogId(null);
    setEntries({});
    setCustomItems([]);
    setFlash(null);
    setNotices([]);
    setInvites([]);
    setSync({ syncing: false, pending: 0, lastSyncAt: null, offline: false });
  }, []);

  const deleteAllData = useCallback(async () => {
    await store.clearAll();
    resetLocalState();
    setMode('unset');
  }, [store, resetLocalState]);

  const startGuest = useCallback(async () => {
    await store.setMode('guest');
    setMode('guest');
  }, [store]);

  const fromUser = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Account => ({
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.display_name as string) ?? '',
  });

  const signIn = useCallback<AppData['signIn']>(
    async (email, password) => {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (err) return isEmailNotConfirmed(err) ? { needsCode: true } : { error: authMessage(err) };
      await enterAccount(fromUser(data.user), { newAccount: false, askAboutGuestData: true });
      return { ok: true };
    },
    [enterAccount],
  );

  const signUp = useCallback<AppData['signUp']>(
    async (name, email, password) => {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: name.trim() } },
      });
      if (err) return { error: authMessage(err) };
      // Supabase meldet bei schon vorhandener Adresse (aus Datenschutzgründen) keinen Fehler, aber ohne Identitäten.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte melde dich an.' };
      }
      if (!data.session || !data.user) return { needsCode: true };
      await enterAccount(fromUser(data.user), { newAccount: true, askAboutGuestData: true });
      return { ok: true };
    },
    [enterAccount],
  );

  const verifyCode = useCallback<AppData['verifyCode']>(
    async (email, code, type) => {
      const { data, error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type });
      if (err || !data.user) return { error: authMessage(err) };
      await enterAccount(fromUser(data.user), { newAccount: type === 'signup', askAboutGuestData: true });
      return { ok: true };
    },
    [enterAccount],
  );

  const resendCode = useCallback<AppData['resendCode']>(async (email, type) => {
    const clean = email.trim().toLowerCase();
    const { error: err } =
      type === 'signup' ? await supabase.auth.resend({ type: 'signup', email: clean }) : await supabase.auth.resetPasswordForEmail(clean);
    return err ? { error: authMessage(err) } : { ok: true };
  }, []);

  const requestPasswordReset = useCallback<AppData['requestPasswordReset']>(async (email) => {
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    return err ? { error: authMessage(err) } : { needsCode: true };
  }, []);

  const setNewPassword = useCallback<AppData['setNewPassword']>(async (password) => {
    const { error: err } = await supabase.auth.updateUser({ password });
    return err ? { error: authMessage(err) } : { ok: true };
  }, []);

  const signOut = useCallback<AppData['signOut']>(
    async (force = false) => {
      const outbox = await readOutbox(store);
      if (outbox.length > 0 && !force) return { pending: outbox.length };
      accountRef.current = null;
      setAccount(null);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // ohne Verbindung trotzdem lokal abmelden
      }
      await store.clearAll();
      resetLocalState();
      setGuestDataQuestion(false);
      setMode('unset');
      return { ok: true };
    },
    [store, resetLocalState],
  );

  const answerGuestData = useCallback(
    async (take: boolean) => {
      if (!take) {
        // Nicht übernehmen: wieder abmelden, die Daten ohne Konto bleiben auf dem Gerät.
        accountRef.current = null;
        setAccount(null);
        setGuestDataQuestion(false);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // egal
        }
        await store.setMode('guest');
        setMode('guest');
        return;
      }
      setGuestDataQuestion(false);
      await enqueueEverything(store);
      await store.setMode('account');
      setFlash('Deine bisherigen Einträge werden in dein Konto übernommen.');
      await reloadLocal();
      void runSync();
    },
    [store, reloadLocal, runSync],
  );

  const deleteAccount = useCallback<AppData['deleteAccount']>(async () => {
    try {
      await server.deleteMyAccount();
    } catch (e) {
      return { error: authMessage(e) };
    }
    await signOut(true);
    return { ok: true };
  }, [signOut]);

  const acceptInvite = useCallback<AppData['acceptInvite']>(
    async (id) => {
      try {
        const dogId = await server.acceptInvite(id);
        await runSync();
        await selectDog(dogId);
        return { ok: true };
      } catch (e) {
        return { error: authMessage(e) };
      }
    },
    [runSync, selectDog],
  );

  const declineInvite = useCallback<AppData['declineInvite']>(
    async (id) => {
      try {
        await server.deleteInvite(id);
        await refreshInvites();
        return { ok: true };
      } catch (e) {
        return { error: authMessage(e) };
      }
    },
    [refreshInvites],
  );

  const value = useMemo<AppData>(
    () => ({
      loading,
      error,
      mode,
      account,
      waitingForFirstSync,
      guestDataQuestion,
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
      startGuest,
      signIn,
      signUp,
      verifyCode,
      resendCode,
      requestPasswordReset,
      setNewPassword,
      answerGuestData,
      signOut,
      deleteAccount,
      sync,
      syncNow: runSync,
      notices,
      dismissNotices: () => setNotices([]),
      invites,
      refreshInvites,
      acceptInvite,
      declineInvite,
    }),
    [
      loading, error, mode, account, waitingForFirstSync, guestDataQuestion, dogs, activeDogId, entries, customItems,
      createDog, selectDog, saveDay, addCustomItem, updateDog, deleteAllData, flash, startGuest, signIn, signUp, verifyCode,
      resendCode, requestPasswordReset, setNewPassword, answerGuestData, signOut, deleteAccount, sync, runSync, notices,
      invites, refreshInvites, acceptInvite, declineInvite,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData außerhalb von AppDataProvider');
  return ctx;
}

/** Ist die angemeldete Person Besitzerin dieses Hundes? (Ohne Konto: immer ja) */
export function isOwnDog(dog: Dog, account: Account | null): boolean {
  return !account || !dog.ownerId || dog.ownerId === account.id;
}
