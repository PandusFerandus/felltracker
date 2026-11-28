/**
 * Prüft die Zugriffsregeln (Row Level Security) der Supabase-Datenbank
 * an einer echten PostgreSQL-Datenbank mit drei Testpersonen.
 * Start: DATABASE_URL=postgres://… npm run test:db
 */
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const ADMIN_URL = process.env.DATABASE_URL;
const DB = `ft_test_${process.pid}`;
const root = join(__dirname, '..');
const sql = (file: string) => readFileSync(join(root, file), 'utf8');

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const EMAIL: Record<string, string> = { [A]: 'anna@beispiel.de', [B]: 'ben@beispiel.de', [C]: 'cem@beispiel.de' };
const DOG = '11111111-1111-4111-8111-111111111111';
const DOG2 = '22222222-2222-4222-8222-222222222222';

const d = ADMIN_URL ? describe : describe.skip;

d('Zugriffsregeln', () => {
  let admin: Client;
  let db: Client;

  beforeAll(async () => {
    admin = new Client({ connectionString: ADMIN_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${DB}`);
    await admin.query(`create database ${DB}`);
    const url = new URL(ADMIN_URL!);
    url.pathname = `/${DB}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();
    await db.query(sql('tests/auth-mock.sql'));
    await db.query(sql('migrations/20261128000000_etappe2.sql'));
  });

  afterAll(async () => {
    await db?.end();
    await admin?.query(`drop database if exists ${DB}`);
    await admin?.end();
  });

  beforeEach(async () => {
    await db.query('begin');
    for (const [id, name] of [[A, 'Anna'], [B, 'Ben'], [C, 'Cem']]) {
      await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
        id, EMAIL[id], { display_name: name },
      ]);
    }
  });
  afterEach(async () => {
    await db.query('rollback');
  });

  /** Führt SQL als angemeldete Person aus (oder ohne Anmeldung, wenn user = null). */
  async function as<T = any>(user: string | null, text: string, params: unknown[] = []): Promise<T[]> {
    await db.query('reset role');
    if (user) {
      await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: user, email: EMAIL[user], role: 'authenticated' })]);
      await db.query('set local role authenticated');
    } else {
      await db.query(`select set_config('request.jwt.claims', '', true)`);
      await db.query('set local role anon');
    }
    await db.query('savepoint q');
    try {
      const res = await db.query(text, params);
      await db.query('release savepoint q');
      return res.rows as T[];
    } catch (e) {
      await db.query('rollback to savepoint q');
      throw e;
    } finally {
      await db.query('reset role');
    }
  }

  const createDog = (user: string, id = DOG, name = 'Bella', updatedAt = '2026-11-01T10:00:00Z') =>
    as(user, `select * from public.upsert_dog($1, $2, null, '', '', '', '', '', '', '', '', '', null, $3)`, [id, name, updatedAt]);
  const saveEntry = (user: string, date: string, note: string, updatedAt: string, deleted = false, dog = DOG) =>
    as(user, `select * from public.upsert_day_entry(gen_random_uuid(), $1, $2, '[{"category":"skin","label":"Juckreiz"}]', 24.6, $3, $4, $5)`, [
      dog, date, note, deleted, updatedAt,
    ]);
  const invite = (owner: string, email: string, dog = DOG) =>
    as(owner, `insert into public.dog_invites (dog_id, email) values ($1, $2) returning id`, [dog, email]);
  const share = async (dog = DOG) => {
    const [{ id }] = await invite(A, EMAIL[B], dog);
    await as(B, `select public.accept_invite($1)`, [id]);
  };

  it('ohne Anmeldung gibt es keinen Zugriff', async () => {
    await createDog(A);
    await expect(as(null, 'select * from public.dogs')).rejects.toThrow(/permission denied/);
    await expect(as(null, 'select * from public.day_entries')).rejects.toThrow(/permission denied/);
    await expect(as(null, 'select * from public.profiles')).rejects.toThrow(/permission denied/);
    await expect(as(null, `select public.delete_my_account()`)).rejects.toThrow(/permission denied/);
  });

  it('jede Person sieht nur eigene Hunde und Einträge', async () => {
    await createDog(A);
    await saveEntry(A, '2026-11-27', 'von Anna', '2026-11-27T10:00:00Z');
    expect(await as(A, 'select id, owner_id from public.dogs')).toEqual([{ id: DOG, owner_id: A }]);
    expect(await as(B, 'select * from public.dogs')).toEqual([]);
    expect(await as(B, 'select * from public.day_entries')).toEqual([]);
  });

  it('fremde Hunde lassen sich weder ändern, löschen noch beschreiben', async () => {
    await createDog(A);
    await expect(createDog(B, DOG, 'Gekapert', '2030-01-01T00:00:00Z')).rejects.toThrow();
    expect(await as(B, `update public.dogs set name = 'X' where id = $1 returning id`, [DOG])).toEqual([]);
    expect(await as(B, `delete from public.dogs where id = $1 returning id`, [DOG])).toEqual([]);
    await expect(saveEntry(B, '2026-11-27', 'x', '2026-11-27T10:00:00Z')).rejects.toThrow(/row-level security/);
    await expect(
      as(B, `insert into public.dogs (id, owner_id, name) values ($1, $2, 'Fake')`, [DOG2, A]),
    ).rejects.toThrow(/row-level security/);
    expect((await as(A, 'select name from public.dogs'))[0].name).toBe('Bella');
  });

  it('Einladung gilt nur für die eingeladene E-Mail-Adresse', async () => {
    await createDog(A);
    const [{ id }] = await invite(A, EMAIL[B]);
    expect(await as(B, 'select dog_name, invited_by_name from public.my_invites()')).toEqual([{ dog_name: 'Bella', invited_by_name: 'Anna' }]);
    expect(await as(C, 'select * from public.my_invites()')).toEqual([]);
    expect(await as(C, 'select * from public.dog_invites')).toEqual([]);
    await expect(as(C, `select public.accept_invite($1)`, [id])).rejects.toThrow(/nicht gefunden/);
    expect(await as(C, 'select * from public.dogs')).toEqual([]);
    // Vor dem Annehmen sieht B den Hund noch nicht.
    expect(await as(B, 'select * from public.dogs')).toEqual([]);
    await as(B, `select public.accept_invite($1)`, [id]);
    expect(await as(B, 'select id from public.dogs')).toEqual([{ id: DOG }]);
    expect(await as(B, 'select * from public.dog_invites')).toEqual([]);
  });

  it('nur die Besitzerperson lädt ein, E-Mail in Kleinbuchstaben', async () => {
    await createDog(A);
    await share();
    await expect(invite(B, EMAIL[C])).rejects.toThrow(/row-level security/);
    await expect(invite(A, 'Cem@Beispiel.de')).rejects.toThrow(/check constraint/);
    await expect(invite(A, EMAIL[A])).rejects.toThrow(/row-level security/);
  });

  it('Mitverwaltende tragen ein und ändern das Profil, aber nicht den Besitz', async () => {
    await createDog(A);
    await share();
    await saveEntry(B, '2026-11-27', 'von Ben', '2026-11-27T10:00:00Z');
    expect((await as(A, 'select note, updated_by from public.day_entries'))[0]).toEqual({ note: 'von Ben', updated_by: B });
    await as(B, `select * from public.upsert_dog($1, 'Bella', '2022-03-14', 'Labrador', '', '', '', '', '', '', '', '', null, '2026-11-02T00:00:00Z')`, [DOG]);
    expect((await as(A, 'select breed from public.dogs'))[0].breed).toBe('Labrador');
    await expect(as(B, `update public.dogs set owner_id = $1 where id = $2`, [B, DOG])).rejects.toThrow(/permission denied/);
    expect(await as(B, `delete from public.dogs where id = $1 returning id`, [DOG])).toEqual([]);
    expect(await as(B, `delete from public.dog_members where user_id = $1 returning user_id`, [B])).toEqual([]);
    expect((await as(A, 'select owner_id from public.dogs'))[0].owner_id).toBe(A);
  });

  it('die Besitzerperson entfernt Personen, danach ist der Zugriff weg', async () => {
    await createDog(A);
    await share();
    await saveEntry(A, '2026-11-27', 'x', '2026-11-27T10:00:00Z');
    expect(await as(B, 'select date from public.day_entries')).toHaveLength(1);
    expect(await as(A, `delete from public.dog_members where user_id = $1 returning user_id`, [B])).toHaveLength(1);
    expect(await as(B, 'select * from public.dogs')).toEqual([]);
    expect(await as(B, 'select * from public.day_entries')).toEqual([]);
  });

  it('Personen eines Hundes und ihre Profile sind nur für Beteiligte sichtbar', async () => {
    await createDog(A);
    await share();
    expect(await as(B, 'select display_name, role from public.dog_people($1)', [DOG])).toEqual([
      { display_name: 'Anna', role: 'owner' },
      { display_name: 'Ben', role: 'member' },
    ]);
    expect(await as(C, 'select * from public.dog_people($1)', [DOG])).toEqual([]);
    expect((await as(B, 'select display_name from public.profiles order by display_name')).map((r) => r.display_name)).toEqual(['Anna', 'Ben']);
    expect((await as(C, 'select display_name from public.profiles')).map((r) => r.display_name)).toEqual(['Cem']);
    await expect(as(B, `update public.profiles set email = 'x@y.de' where id = $1`, [B])).rejects.toThrow(/permission denied/);
  });

  it('am selben Tag gewinnt die neuere Änderung', async () => {
    await createDog(A);
    await share();
    await saveEntry(A, '2026-11-27', 'neu', '2026-11-27T12:00:00Z');
    const [older] = await saveEntry(B, '2026-11-27', 'alt', '2026-11-27T11:00:00Z');
    expect(older.note).toBe('neu');
    const [newer] = await saveEntry(B, '2026-11-27', 'neuer', '2026-11-27T13:00:00Z');
    expect(newer.note).toBe('neuer');
    const [del] = await saveEntry(A, '2026-11-27', '', '2026-11-27T14:00:00Z', true);
    expect(del.deleted).toBe(true);
    expect(await as(A, 'select count(*)::int as n from public.day_entries')).toEqual([{ n: 1 }]);
  });

  it('beim Hund gewinnt ebenfalls die neuere Änderung', async () => {
    await createDog(A, DOG, 'Bella', '2026-11-10T00:00:00Z');
    const [res] = await createDog(A, DOG, 'Alt', '2026-11-09T00:00:00Z');
    expect(res.name).toBe('Bella');
  });

  it('eigene Punkte sieht nur die eigene Person, Namen sind eindeutig', async () => {
    await as(A, `insert into public.custom_items (id, category, label) values (gen_random_uuid(), 'skin', 'Kratzt am Hals')`);
    expect(await as(B, 'select * from public.custom_items')).toEqual([]);
    await expect(
      as(A, `insert into public.custom_items (id, category, label) values (gen_random_uuid(), 'digestion', 'KRATZT AM HALS')`),
    ).rejects.toThrow(/duplicate key/);
    await as(B, `insert into public.custom_items (id, category, label) values (gen_random_uuid(), 'skin', 'Kratzt am Hals')`);
    await expect(
      as(B, `insert into public.custom_items (id, user_id, category, label) values (gen_random_uuid(), $1, 'skin', 'Neu')`, [A]),
    ).rejects.toThrow(/row-level security/);
  });

  it('Konto löschen: geteilter Hund geht an die Mitperson über, alleiniger Hund wird gelöscht', async () => {
    await createDog(A);
    await createDog(A, DOG2, 'Milo');
    await share(DOG);
    await saveEntry(A, '2026-11-27', 'bleibt', '2026-11-27T10:00:00Z');
    await saveEntry(A, '2026-11-26', 'weg', '2026-11-26T10:00:00Z', false, DOG2);
    await invite(A, EMAIL[C]);
    await as(A, `insert into public.custom_items (id, category, label) values (gen_random_uuid(), 'skin', 'Annas Punkt')`);

    await as(A, 'select public.delete_my_account()');

    expect((await db.query('select count(*)::int as n from auth.users where id = $1', [A])).rows[0].n).toBe(0);
    expect(await as(B, 'select id, owner_id from public.dogs')).toEqual([{ id: DOG, owner_id: B }]);
    expect(await as(B, 'select note from public.day_entries')).toEqual([{ note: 'bleibt' }]);
    expect(await as(B, 'select * from public.dog_members')).toEqual([]);
    const left = await db.query('select (select count(*) from public.dogs where id = $1)::int as milo, (select count(*) from public.day_entries where dog_id = $1)::int as entries, (select count(*) from public.custom_items)::int as custom, (select count(*) from public.dog_invites)::int as invites, (select count(*) from public.profiles where id = $2)::int as profile', [DOG2, A]);
    expect(left.rows[0]).toEqual({ milo: 0, entries: 0, custom: 0, invites: 0, profile: 0 });
  });

  it('Konto löschen als Mitperson: Hund bleibt bei der Besitzerperson', async () => {
    await createDog(A);
    await share();
    await as(B, 'select public.delete_my_account()');
    expect(await as(A, 'select id, owner_id from public.dogs')).toEqual([{ id: DOG, owner_id: A }]);
    expect(await as(A, 'select * from public.dog_members')).toEqual([]);
  });
});
