// Schnittstelle zum Server. Die Umsetzung mit Supabase steht in remote-supabase.ts;
// Tests nutzen einen einfachen Ersatz.

import type { CategoryId, DateKey, SelectedItem, Species } from './types';

export type RemoteDog = {
  id: string;
  owner_id: string;
  species: Species;
  name: string;
  birthday: DateKey | null;
  breed: string;
  medication: string;
  food_type: string;
  food_amount: string;
  vet_practice: string;
  vet_address: string;
  vet_phone: string;
  info: string;
  photo: string;
  created_at: string;
  updated_at: string;
  server_updated_at: string;
};

export type RemoteEntry = {
  id: string;
  dog_id: string;
  date: DateKey;
  items: SelectedItem[];
  weight_kg: number | string | null;
  note: string;
  deleted: boolean;
  updated_at: string;
  server_updated_at: string;
};

export type RemoteCustomItem = {
  id: string;
  species: Species;
  category: CategoryId;
  label: string;
  created_at: string;
};

export type Person = { userId: string; name: string; email: string; role: 'owner' | 'member' };
export type Invite = { id: string; dogId: string; dogName: string; invitedBy: string };
export type PendingInvite = { id: string; email: string };

export interface RemoteApi {
  listDogs(): Promise<RemoteDog[]>;
  upsertDog(dog: Omit<RemoteDog, 'owner_id' | 'server_updated_at' | 'species'>): Promise<RemoteDog>;
  listEntriesSince(dogId: string, since: string | null): Promise<RemoteEntry[]>;
  upsertEntry(entry: Omit<RemoteEntry, 'server_updated_at'>): Promise<RemoteEntry>;
  listCustomItems(): Promise<RemoteCustomItem[]>;
  /** Legt an; gibt es den Namen schon, passiert nichts. */
  insertCustomItem(item: RemoteCustomItem): Promise<void>;
  dogPeople(dogId: string): Promise<Person[]>;
}

/** Vergleich von Zeitstempeln unabhängig von der Schreibweise (Z oder +00:00) */
export const time = (iso: string) => new Date(iso).getTime();
