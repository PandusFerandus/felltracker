import { supabase } from '@/lib/supabase';

import type { Invite, PendingInvite, Person, RemoteApi, RemoteCustomItem, RemoteDog, RemoteEntry } from './remote';

function check<T>(res: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (res.error) throw Object.assign(new Error(res.error.message), { code: res.error.code });
  return res.data as T;
}

const DOG_COLUMNS =
  'id, owner_id, species, name, birthday, breed, medication, food_type, food_amount, vet_practice, vet_address, vet_phone, info, photo, created_at, updated_at, server_updated_at';

export const supabaseRemote: RemoteApi = {
  async listDogs() {
    return check(await supabase.from('dogs').select(DOG_COLUMNS).order('created_at')) as RemoteDog[];
  },

  async upsertDog(d) {
    return check(
      await supabase.rpc('upsert_dog', {
        p_id: d.id,
        p_name: d.name,
        p_birthday: d.birthday,
        p_breed: d.breed,
        p_medication: d.medication,
        p_food_type: d.food_type,
        p_food_amount: d.food_amount,
        p_vet_practice: d.vet_practice,
        p_vet_address: d.vet_address,
        p_vet_phone: d.vet_phone,
        p_info: d.info,
        p_photo: d.photo,
        p_created_at: d.created_at,
        p_updated_at: d.updated_at,
      }),
    ) as RemoteDog;
  },

  async listEntriesSince(dogId, since) {
    // Der Server liefert höchstens 1000 Zeilen auf einmal – daher in Portionen holen.
    const PAGE = 1000;
    const all: RemoteEntry[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = supabase.from('day_entries').select('*').eq('dog_id', dogId);
      if (since) q = q.gt('server_updated_at', since);
      const rows = check(await q.order('server_updated_at').order('id').range(from, from + PAGE - 1)) as RemoteEntry[];
      all.push(...rows);
      if (rows.length < PAGE) return all;
    }
  },

  async upsertEntry(e) {
    return check(
      await supabase.rpc('upsert_day_entry', {
        p_id: e.id,
        p_dog_id: e.dog_id,
        p_date: e.date,
        p_items: e.items,
        p_weight_kg: e.weight_kg,
        p_note: e.note,
        p_deleted: e.deleted,
        p_updated_at: e.updated_at,
      }),
    ) as RemoteEntry;
  },

  async listCustomItems() {
    return check(await supabase.from('custom_items').select('id, species, category, label, created_at').order('created_at')) as RemoteCustomItem[];
  },

  async insertCustomItem(c) {
    const res = await supabase.from('custom_items').insert(c);
    // 23505: Den Namen gibt es schon – dann gilt der vorhandene.
    if (res.error && res.error.code !== '23505') check(res);
  },

  async dogPeople(dogId) {
    const rows = check(await supabase.rpc('dog_people', { p_dog: dogId })) as {
      user_id: string;
      display_name: string;
      email: string;
      role: 'owner' | 'member';
    }[];
    return rows.map((r) => ({ userId: r.user_id, name: r.display_name, email: r.email, role: r.role }));
  },
};

// Gemeinsam verwalten

export async function myInvites(): Promise<Invite[]> {
  const rows = check(await supabase.rpc('my_invites')) as { id: string; dog_id: string; dog_name: string; invited_by_name: string }[];
  return rows.map((r) => ({ id: r.id, dogId: r.dog_id, dogName: r.dog_name, invitedBy: r.invited_by_name }));
}

export async function acceptInvite(id: string): Promise<string> {
  return check(await supabase.rpc('accept_invite', { p_invite: id })) as string;
}

export async function deleteInvite(id: string): Promise<void> {
  check(await supabase.from('dog_invites').delete().eq('id', id));
}

export async function pendingInvites(dogId: string): Promise<PendingInvite[]> {
  return check(await supabase.from('dog_invites').select('id, email').eq('dog_id', dogId).order('created_at')) as PendingInvite[];
}

export async function inviteByEmail(dogId: string, email: string): Promise<'ok' | 'exists'> {
  const res = await supabase.from('dog_invites').insert({ dog_id: dogId, email });
  if (res.error?.code === '23505') return 'exists';
  check(res);
  return 'ok';
}

export async function removeMember(dogId: string, userId: string): Promise<void> {
  check(await supabase.from('dog_members').delete().eq('dog_id', dogId).eq('user_id', userId));
}

export async function dogPeople(dogId: string): Promise<Person[]> {
  return supabaseRemote.dogPeople(dogId);
}

export async function deleteMyAccount(): Promise<void> {
  check(await supabase.rpc('delete_my_account'));
}
