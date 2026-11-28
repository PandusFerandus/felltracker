// Abgleich zwischen diesem Gerät und dem Server.
// Grundsatz: Das Gerät arbeitet immer mit seinen lokalen Daten (auch ohne Internet).
// Änderungen landen in einer Warteschlange und werden beim nächsten Abgleich übertragen.
// Am selben Tag gewinnt die neuere Änderung; wird eine eigene Änderung dabei verworfen,
// entsteht ein Hinweis für die Person.

import { longDate, toDateKey } from './dates';
import { time, type RemoteApi, type RemoteDog, type RemoteEntry } from './remote';
import type { LocalStore } from './storage';
import type { CustomItem, DateKey, DayEntry, Dog } from './types';

export type Op =
  | { kind: 'dog'; id: string }
  | { kind: 'entry'; dogId: string; date: DateKey; at: string }
  | { kind: 'custom'; id: string };

export type SyncState = {
  userId: string | null;
  /** Je Hund: Server-Zeitpunkt des zuletzt geholten Eintrags */
  entryCursors: Record<string, string>;
  lastSyncAt: string | null;
};

const OUTBOX = 'outbox';
const STATE = 'sync';
export const EMPTY_STATE: SyncState = { userId: null, entryCursors: {}, lastSyncAt: null };

const opKey = (op: Op) => (op.kind === 'entry' ? `entry:${op.dogId}:${op.date}` : `${op.kind}:${op.id}`);

export async function readOutbox(local: LocalStore): Promise<Op[]> {
  return local.readJson<Op[]>(OUTBOX, []);
}

/** Merkt eine Änderung zum Übertragen vor (je Hund/Tag/Punkt nur einmal). */
export async function enqueue(local: LocalStore, ops: Op[]): Promise<void> {
  const current = await readOutbox(local);
  const keys = new Set(ops.map(opKey));
  await local.writeJson(OUTBOX, [...current.filter((o) => !keys.has(opKey(o))), ...ops]);
}

async function dropOps(local: LocalStore, done: Set<string>) {
  if (done.size === 0) return;
  const current = await readOutbox(local);
  await local.writeJson(OUTBOX, current.filter((o) => !done.has(opKey(o))));
}

export async function readSyncState(local: LocalStore): Promise<SyncState> {
  const stored = await local.readJson<Partial<SyncState>>(STATE, {});
  return { ...EMPTY_STATE, ...stored, entryCursors: { ...(stored.entryCursors ?? {}) } };
}

export async function writeSyncState(local: LocalStore, state: SyncState): Promise<void> {
  await local.writeJson(STATE, state);
}

/** Alle Hunde, Einträge und eigenen Punkte dieses Geräts zum Übertragen vormerken (z. B. nach dem Erstellen eines Kontos). */
export async function enqueueEverything(local: LocalStore): Promise<number> {
  const dogs = await local.listDogs();
  const ops: Op[] = dogs.map((d) => ({ kind: 'dog', id: d.id }));
  for (const d of dogs) {
    const entries = await local.listEntries(d.id);
    for (const e of Object.values(entries)) ops.push({ kind: 'entry', dogId: d.id, date: e.date, at: e.updatedAt });
  }
  for (const c of await local.listCustomItems()) ops.push({ kind: 'custom', id: c.id });
  await enqueue(local, ops);
  return dogs.length;
}

// Umwandlung Server <-> Gerät

export function dogFromRemote(r: RemoteDog, sharedWith?: string[]): Dog {
  return {
    id: r.id,
    species: r.species,
    name: r.name,
    birthday: r.birthday ?? '',
    breed: r.breed,
    medication: r.medication,
    foodType: r.food_type,
    foodAmount: r.food_amount,
    vet: { practice: r.vet_practice, address: r.vet_address, phone: r.vet_phone },
    info: r.info,
    photo: r.photo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ownerId: r.owner_id,
    sharedWith,
  };
}

export function dogToRemote(d: Dog) {
  return {
    id: d.id,
    name: d.name,
    birthday: d.birthday || null,
    breed: d.breed,
    medication: d.medication,
    food_type: d.foodType,
    food_amount: d.foodAmount,
    vet_practice: d.vet.practice,
    vet_address: d.vet.address,
    vet_phone: d.vet.phone,
    info: d.info,
    photo: d.photo,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

export function entryFromRemote(r: RemoteEntry): DayEntry {
  return {
    id: r.id,
    dogId: r.dog_id,
    date: r.date,
    items: r.items,
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    note: r.note,
    updatedAt: r.updated_at,
  };
}

export type SyncResult = { notices: string[]; changed: boolean };

/** Ein vollständiger Abgleich: erst eigene Änderungen senden, dann neue Daten holen. */
export async function syncOnce(local: LocalStore, remote: RemoteApi, userId: string, today = toDateKey(new Date())): Promise<SyncResult> {
  const notices: string[] = [];
  let changed = false;
  let state = await readSyncState(local);
  if (state.userId !== userId) state = { ...EMPTY_STATE, entryCursors: {}, userId };

  const dogName = async (dogId: string) => (await local.listDogs()).find((d) => d.id === dogId)?.name ?? 'deinen Hund';
  const conflict = async (dogId: string, date: DateKey) =>
    notices.push(
      `${longDate(date, today)} bei ${await dogName(dogId)}: Auf einem anderen Gerät gab es eine neuere Änderung. Die neuere Fassung wurde übernommen.`,
    );

  // 1. Senden – Hunde zuerst (Einträge brauchen den Hund auf dem Server), dann eigene Punkte, dann Einträge.
  const outbox = await readOutbox(local);
  const order = { dog: 0, custom: 1, entry: 2 } as const;
  const done = new Set<string>();
  const dogs = new Map((await local.listDogs()).map((d) => [d.id, d]));
  const custom = new Map((await local.listCustomItems()).map((c) => [c.id, c]));

  for (const op of [...outbox].sort((a, b) => order[a.kind] - order[b.kind])) {
    if (op.kind === 'dog') {
      const dog = dogs.get(op.id);
      if (!dog) {
        done.add(opKey(op));
        continue;
      }
      const saved = await remote.upsertDog(dogToRemote(dog));
      if (time(saved.updated_at) > time(dog.updatedAt)) changed = true;
      await local.putDog(dogFromRemote(saved, dog.sharedWith));
      done.add(opKey(op));
    } else if (op.kind === 'custom') {
      const item = custom.get(op.id);
      if (item) {
        await remote.insertCustomItem({ id: item.id, species: item.species, category: item.category, label: item.label, created_at: item.createdAt });
      }
      done.add(opKey(op));
    } else {
      const entries = await local.listEntries(op.dogId);
      const mine = entries[op.date];
      const at = mine?.updatedAt ?? op.at;
      const saved = await remote.upsertEntry({
        id: mine?.id ?? cryptoLikeId(op),
        dog_id: op.dogId,
        date: op.date,
        items: mine?.items ?? [],
        weight_kg: mine?.weightKg ?? null,
        note: mine?.note ?? '',
        deleted: !mine,
        updated_at: at,
      });
      if (time(saved.updated_at) > time(at)) {
        await applyEntry(local, saved);
        await conflict(op.dogId, op.date);
        changed = true;
      } else if (mine && saved.id !== mine.id) {
        // Gleicher Tag wurde woanders schon angelegt: die Kennung vom Server übernehmen.
        await local.putEntry({ ...mine, id: saved.id });
      }
      done.add(opKey(op));
    }
  }
  await dropOps(local, done);

  // 2. Holen
  const pending = await readOutbox(local);
  const pendingKeys = new Set(pending.map(opKey));

  const remoteDogs = await remote.listDogs();
  const remoteIds = new Set(remoteDogs.map((d) => d.id));
  for (const d of await local.listDogs()) {
    // Hunde ohne Konto (noch nie übertragen) werden nie automatisch entfernt.
    if (d.ownerId && !remoteIds.has(d.id) && !pendingKeys.has(`dog:${d.id}`)) {
      await local.removeDogLocally(d.id);
      delete state.entryCursors[d.id];
      changed = true;
    }
  }
  for (const r of remoteDogs) {
    const people = await remote.dogPeople(r.id);
    const sharedWith = people.filter((p) => p.userId !== userId).map((p) => p.name || p.email);
    const mine = (await local.listDogs()).find((d) => d.id === r.id);
    if (mine && pendingKeys.has(`dog:${r.id}`) && time(mine.updatedAt) > time(r.updated_at)) {
      await local.putDog({ ...mine, ownerId: r.owner_id, sharedWith });
      continue;
    }
    const next = dogFromRemote(r, sharedWith);
    if (!mine || JSON.stringify(mine) !== JSON.stringify(next)) {
      await local.putDog(next);
      changed = true;
    }

    const rows = await remote.listEntriesSince(r.id, state.entryCursors[r.id] ?? null);
    for (const row of rows) {
      const key = `entry:${r.id}:${row.date}`;
      const localEntries = await local.listEntries(r.id);
      const localEntry = localEntries[row.date];
      if (pendingKeys.has(key)) {
        const op = pending.find((o) => opKey(o) === key) as Extract<Op, { kind: 'entry' }>;
        const localAt = localEntry?.updatedAt ?? op.at;
        if (time(localAt) >= time(row.updated_at)) continue; // eigene, neuere Änderung wird noch gesendet
        await dropOps(local, new Set([key]));
        await conflict(r.id, row.date);
      }
      if (row.deleted ? !!localEntry : !localEntry || localEntry.updatedAt !== row.updated_at || localEntry.id !== row.id) {
        await applyEntry(local, row);
        changed = true;
      }
      const cursor = state.entryCursors[r.id];
      if (!cursor || time(row.server_updated_at) > time(cursor)) state.entryCursors[r.id] = row.server_updated_at;
    }
  }

  // Eigene Punkte: Server-Liste plus noch nicht gesendete eigene.
  const remoteCustom = await remote.listCustomItems();
  const stillPending = (await local.listCustomItems()).filter((c) => pendingKeys.has(`custom:${c.id}`));
  const merged: CustomItem[] = [
    ...remoteCustom.map((c) => ({ id: c.id, species: c.species, category: c.category, label: c.label, createdAt: c.created_at })),
    ...stillPending.filter((p) => !remoteCustom.some((c) => c.label.toLocaleLowerCase('de') === p.label.toLocaleLowerCase('de'))),
  ];
  const before = await local.listCustomItems();
  if (JSON.stringify(before) !== JSON.stringify(merged)) {
    await local.setCustomItems(merged);
    changed = true;
  }

  await writeSyncState(local, { ...state, lastSyncAt: new Date().toISOString() });
  return { notices, changed };
}

async function applyEntry(local: LocalStore, row: RemoteEntry) {
  if (row.deleted) await local.removeEntryLocally(row.dog_id, row.date);
  else await local.putEntry(entryFromRemote(row));
}

/** Kennung für einen Löschvermerk, wenn der Eintrag lokal nicht mehr existiert. */
function cryptoLikeId(op: Extract<Op, { kind: 'entry' }>): string {
  const hex = Array.from(`${op.dogId}${op.date}`).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(8, '0');
  return `${hex}-0000-4000-8000-${op.date.replace(/-/g, '').padEnd(12, '0')}`;
}
