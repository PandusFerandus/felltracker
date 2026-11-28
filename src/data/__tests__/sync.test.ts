import { beforeEach, describe, expect, it } from '@jest/globals';

import { time, type Person, type RemoteApi, type RemoteCustomItem, type RemoteDog, type RemoteEntry } from '../remote';
import { createLocalStore, type KeyValueStorage, type LocalStore } from '../storage';
import { enqueue, enqueueEverything, readOutbox, syncOnce } from '../sync';

const ME = 'user-me';

function memoryKv(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
    getAllKeys: async () => [...data.keys()],
  };
}

/** Nachgebauter Server mit "neuere Änderung gewinnt" wie in der Datenbank. */
class FakeRemote implements RemoteApi {
  dogs = new Map<string, RemoteDog>();
  entries = new Map<string, RemoteEntry>();
  custom: RemoteCustomItem[] = [];
  people: Record<string, Person[]> = {};
  offline = false;
  clock = 1000;
  private stamp() {
    this.clock += 1;
    return new Date(Date.UTC(2026, 10, 27, 0, 0, this.clock)).toISOString();
  }
  private check() {
    if (this.offline) throw new Error('offline');
  }
  async listDogs() {
    this.check();
    return [...this.dogs.values()];
  }
  async upsertDog(d: Parameters<RemoteApi['upsertDog']>[0]) {
    this.check();
    const cur = this.dogs.get(d.id);
    if (!cur || time(cur.updated_at) < time(d.updated_at)) {
      this.dogs.set(d.id, { ...d, species: 'dog', owner_id: cur?.owner_id ?? ME, server_updated_at: this.stamp() });
    }
    return this.dogs.get(d.id)!;
  }
  async listEntriesSince(dogId: string, since: string | null) {
    this.check();
    return [...this.entries.values()].filter((e) => e.dog_id === dogId && (!since || time(e.server_updated_at) > time(since)));
  }
  async upsertEntry(e: Parameters<RemoteApi['upsertEntry']>[0]) {
    this.check();
    const key = `${e.dog_id}:${e.date}`;
    const cur = this.entries.get(key);
    if (!cur) this.entries.set(key, { ...e, server_updated_at: this.stamp() });
    else if (time(cur.updated_at) < time(e.updated_at)) this.entries.set(key, { ...e, id: cur.id, server_updated_at: this.stamp() });
    return this.entries.get(key)!;
  }
  async listCustomItems() {
    this.check();
    return this.custom;
  }
  async insertCustomItem(c: RemoteCustomItem) {
    this.check();
    if (!this.custom.some((x) => x.label.toLowerCase() === c.label.toLowerCase())) this.custom.push(c);
  }
  async dogPeople(dogId: string) {
    this.check();
    return this.people[dogId] ?? [];
  }
  /** Änderung von einem anderen Gerät */
  otherDevice(e: Omit<RemoteEntry, 'server_updated_at'>) {
    this.entries.set(`${e.dog_id}:${e.date}`, { ...e, server_updated_at: this.stamp() });
  }
}

let local: LocalStore;
let remote: FakeRemote;
let n = 0;
let nowMs = Date.UTC(2026, 10, 27, 10, 0, 0);

beforeEach(() => {
  n = 0;
  nowMs = Date.UTC(2026, 10, 27, 10, 0, 0);
  local = createLocalStore(memoryKv(), { newId: () => `id-${++n}`, now: () => new Date((nowMs += 1000)) });
  remote = new FakeRemote();
});

const juck = [{ category: 'skin' as const, label: 'Juckreiz' }];

describe('Abgleich mit dem Server', () => {
  it('überträgt beim Erstellen eines Kontos alle Daten ohne lokal etwas zu löschen', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await local.saveEntry(dog.id, '2026-11-27', { items: juck, weightKg: 24.6, note: 'a' });
    await local.addCustomItem({ category: 'skin', label: 'Kratzt am Hals' });
    expect(await enqueueEverything(local)).toBe(1);
    await syncOnce(local, remote, ME, '2026-11-27');
    expect(remote.dogs.get(dog.id)?.name).toBe('Bella');
    expect(remote.entries.get(`${dog.id}:2026-11-27`)?.note).toBe('a');
    expect(remote.custom.map((c) => c.label)).toEqual(['Kratzt am Hals']);
    expect(await readOutbox(local)).toEqual([]);
    expect((await local.listDogs())[0].ownerId).toBe(ME);
    expect(Object.keys(await local.listEntries(dog.id))).toEqual(['2026-11-27']);
  });

  it('ohne Internet bleibt alles lokal und wird später übertragen', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await enqueue(local, [{ kind: 'dog', id: dog.id }]);
    await local.saveEntry(dog.id, '2026-11-27', { items: juck, weightKg: null, note: '' });
    await enqueue(local, [{ kind: 'entry', dogId: dog.id, date: '2026-11-27', at: new Date().toISOString() }]);
    remote.offline = true;
    await expect(syncOnce(local, remote, ME)).rejects.toThrow('offline');
    expect(await readOutbox(local)).toHaveLength(2);
    expect(Object.keys(await local.listEntries(dog.id))).toEqual(['2026-11-27']);
    remote.offline = false;
    await syncOnce(local, remote, ME);
    expect(await readOutbox(local)).toEqual([]);
    expect(remote.entries.size).toBe(1);
  });

  it('holt Einträge von anderen Geräten, auch Löschungen', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await enqueueEverything(local);
    await syncOnce(local, remote, ME);
    remote.otherDevice({ id: 'r1', dog_id: dog.id, date: '2026-11-20', items: juck, weight_kg: '24.5', note: 'vom Handy', deleted: false, updated_at: '2026-11-20T10:00:00Z' });
    const res = await syncOnce(local, remote, ME);
    expect(res.changed).toBe(true);
    expect((await local.listEntries(dog.id))['2026-11-20']).toMatchObject({ note: 'vom Handy', weightKg: 24.5 });
    remote.otherDevice({ id: 'r1', dog_id: dog.id, date: '2026-11-20', items: [], weight_kg: null, note: '', deleted: true, updated_at: '2026-11-21T10:00:00Z' });
    await syncOnce(local, remote, ME);
    expect(await local.listEntries(dog.id)).toEqual({});
  });

  it('am selben Tag gewinnt die neuere Änderung, und das wird angezeigt', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await enqueueEverything(local);
    await syncOnce(local, remote, ME, '2026-11-27');
    // Dieses Gerät ändert offline um 10:00 …
    await local.saveEntry(dog.id, '2026-11-27', { items: juck, weightKg: null, note: 'hier' });
    await enqueue(local, [{ kind: 'entry', dogId: dog.id, date: '2026-11-27', at: new Date().toISOString() }]);
    // … ein anderes Gerät um 12:00.
    remote.otherDevice({ id: 'r2', dog_id: dog.id, date: '2026-11-27', items: [], weight_kg: null, note: 'dort', deleted: false, updated_at: '2026-11-27T12:00:00Z' });
    const res = await syncOnce(local, remote, ME, '2026-11-27');
    expect((await local.listEntries(dog.id))['2026-11-27'].note).toBe('dort');
    expect(res.notices).toEqual(['27. November bei Bella: Auf einem anderen Gerät gab es eine neuere Änderung. Die neuere Fassung wurde übernommen.']);
    expect(await readOutbox(local)).toEqual([]);
  });

  it('eine neuere eigene Änderung überschreibt die ältere vom Server', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await enqueueEverything(local);
    await syncOnce(local, remote, ME);
    remote.otherDevice({ id: 'r3', dog_id: dog.id, date: '2026-11-27', items: [], weight_kg: null, note: 'alt', deleted: false, updated_at: '2026-11-27T08:00:00Z' });
    await local.saveEntry(dog.id, '2026-11-27', { items: juck, weightKg: null, note: 'neu' });
    await enqueue(local, [{ kind: 'entry', dogId: dog.id, date: '2026-11-27', at: new Date().toISOString() }]);
    const res = await syncOnce(local, remote, ME);
    expect(res.notices).toEqual([]);
    expect(remote.entries.get(`${dog.id}:2026-11-27`)).toMatchObject({ note: 'neu', id: 'r3' });
    expect((await local.listEntries(dog.id))['2026-11-27']).toMatchObject({ note: 'neu', id: 'r3' });
  });

  it('ein lokal gelöschter Eintrag wird auch auf dem Server gelöscht', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await local.saveEntry(dog.id, '2026-11-27', { items: juck, weightKg: null, note: '' });
    await enqueueEverything(local);
    await syncOnce(local, remote, ME);
    await local.deleteEntry(dog.id, '2026-11-27');
    await enqueue(local, [{ kind: 'entry', dogId: dog.id, date: '2026-11-27', at: new Date(nowMs + 5000).toISOString() }]);
    await syncOnce(local, remote, ME);
    expect(remote.entries.get(`${dog.id}:2026-11-27`)?.deleted).toBe(true);
    expect(await local.listEntries(dog.id)).toEqual({});
  });

  it('entfernt Hunde, auf die man keinen Zugriff mehr hat, und zeigt Mitverwaltende', async () => {
    const dog = await local.createDog({ name: 'Bella' });
    await enqueueEverything(local);
    remote.people[dog.id] = [
      { userId: ME, name: 'Ich', email: 'ich@x.de', role: 'owner' },
      { userId: 'u2', name: 'Alex', email: 'alex@x.de', role: 'member' },
    ];
    await syncOnce(local, remote, ME);
    expect((await local.listDogs())[0].sharedWith).toEqual(['Alex']);
    remote.dogs.delete(dog.id);
    await syncOnce(local, remote, ME);
    expect(await local.listDogs()).toEqual([]);
  });

  it('löscht nie Hunde, die noch nie übertragen wurden', async () => {
    const dog = await local.createDog({ name: 'Nur hier' });
    await syncOnce(local, remote, ME);
    expect((await local.listDogs()).map((d) => d.id)).toEqual([dog.id]);
  });

  it('holt geteilte Hunde anderer Personen samt Einträgen', async () => {
    remote.dogs.set('fremd', {
      id: 'fremd', owner_id: 'u2', species: 'dog', name: 'Milo', birthday: null, breed: '', medication: '', food_type: '',
      food_amount: '', vet_practice: '', vet_address: '', vet_phone: '', info: '', photo: '', created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z', server_updated_at: '2026-11-01T00:00:00Z',
    });
    remote.otherDevice({ id: 'r4', dog_id: 'fremd', date: '2026-11-25', items: juck, weight_kg: null, note: '', deleted: false, updated_at: '2026-11-25T10:00:00Z' });
    await syncOnce(local, remote, ME);
    expect((await local.listDogs()).map((d) => [d.name, d.ownerId])).toEqual([['Milo', 'u2']]);
    expect(Object.keys(await local.listEntries('fremd'))).toEqual(['2026-11-25']);
  });
});
