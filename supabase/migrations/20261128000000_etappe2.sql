-- Felltagebuch – Etappe 2: Konten und gemeinsames Verwalten
-- Diese Datei wird einmal im Supabase-SQL-Editor ausgeführt.
-- Jede Tabelle hat Zugriffsregeln (Row Level Security):
-- Jede Person sieht nur eigene und mit ihr geteilte Hunde.

-------------------------------------------------------------------------------
-- Tabellen
-------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.dogs (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species text not null default 'dog' check (species in ('dog')),
  name text not null check (char_length(name) between 1 and 40),
  birthday date,
  breed text not null default '' check (char_length(breed) <= 60),
  medication text not null default '' check (char_length(medication) <= 500),
  food_type text not null default '' check (char_length(food_type) <= 80),
  food_amount text not null default '' check (char_length(food_amount) <= 80),
  vet_practice text not null default '' check (char_length(vet_practice) <= 80),
  vet_address text not null default '' check (char_length(vet_address) <= 200),
  vet_phone text not null default '' check (char_length(vet_phone) <= 40),
  info text not null default '' check (char_length(info) <= 2000),
  photo text not null default '' check (
    char_length(photo) <= 400000 and (photo = '' or photo like 'data:image/jpeg;base64,%')
  ),
  created_at timestamptz not null default now(),
  -- Zeitpunkt der Änderung auf dem Gerät (für "neuere Änderung gewinnt")
  updated_at timestamptz not null default now(),
  -- Zeitpunkt der Speicherung auf dem Server (für den Abgleich)
  server_updated_at timestamptz not null default now()
);
create index dogs_owner_idx on public.dogs (owner_id);

create table public.dog_members (
  dog_id uuid not null references public.dogs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dog_id, user_id)
);
create index dog_members_user_idx on public.dog_members (user_id);

create table public.dog_invites (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%' and char_length(email) <= 254),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (dog_id, email)
);
create index dog_invites_email_idx on public.dog_invites (email);

create table public.day_entries (
  id uuid primary key,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  date date not null,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 200),
  weight_kg numeric(4, 1) check (weight_kg is null or (weight_kg > 0 and weight_kg < 120)),
  note text not null default '' check (char_length(note) <= 2000),
  -- Gelöschte Einträge bleiben als "gelöscht" stehen, damit andere Geräte davon erfahren.
  deleted boolean not null default false,
  updated_at timestamptz not null,
  updated_by uuid default auth.uid() references auth.users (id) on delete set null,
  server_updated_at timestamptz not null default now(),
  unique (dog_id, date)
);
create index day_entries_sync_idx on public.day_entries (dog_id, server_updated_at);

create table public.custom_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  species text not null default 'dog' check (species in ('dog')),
  category text not null check (category in ('events', 'skin', 'digestion', 'joints')),
  label text not null check (char_length(label) between 1 and 40),
  created_at timestamptz not null default now(),
  server_updated_at timestamptz not null default now()
);
create unique index custom_items_label_idx on public.custom_items (user_id, species, lower(label));

-------------------------------------------------------------------------------
-- Hilfsfunktionen
-------------------------------------------------------------------------------

create function public.my_email() returns text
language sql stable set search_path = ''
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create function public.is_dog_owner(p_dog uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.dogs where id = p_dog and owner_id = auth.uid()) $$;

create function public.is_dog_member(p_dog uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.dogs where id = p_dog and owner_id = auth.uid())
      or exists (select 1 from public.dog_members where dog_id = p_dog and user_id = auth.uid())
$$;

-- Teilt die angemeldete Person einen Hund mit dieser Person?
create function public.shares_dog_with(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  with mine as (
    select id as dog_id from public.dogs where owner_id = auth.uid()
    union select dog_id from public.dog_members where user_id = auth.uid()
  )
  select exists (
    select 1 from mine m
    where exists (select 1 from public.dogs d where d.id = m.dog_id and d.owner_id = p_user)
       or exists (select 1 from public.dog_members x where x.dog_id = m.dog_id and x.user_id = p_user)
  )
$$;

-------------------------------------------------------------------------------
-- Trigger
-------------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), lower(coalesce(new.email, '')));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.touch_server_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end $$;

create trigger dogs_touch before insert or update on public.dogs
for each row execute function public.touch_server_updated_at();
create trigger custom_items_touch before insert or update on public.custom_items
for each row execute function public.touch_server_updated_at();

create function public.touch_day_entry() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.server_updated_at := now();
  -- Nur echte Änderungen vermerken (nicht z. B. das Aufräumen beim Löschen eines Kontos).
  if tg_op = 'INSERT' or new.updated_at is distinct from old.updated_at then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

create trigger day_entries_touch before insert or update on public.day_entries
for each row execute function public.touch_day_entry();

-------------------------------------------------------------------------------
-- Rechte und Zugriffsregeln
-------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.dogs enable row level security;
alter table public.dog_members enable row level security;
alter table public.dog_invites enable row level security;
alter table public.day_entries enable row level security;
alter table public.custom_items enable row level security;

-- Ohne Anmeldung (anon) gibt es keinerlei Zugriff.
revoke all on public.profiles, public.dogs, public.dog_members, public.dog_invites, public.day_entries, public.custom_items
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_dog_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select, insert, delete on public.dogs to authenticated;
-- Besitz (owner_id) und id dürfen nicht von der App geändert werden.
grant update (name, birthday, breed, medication, food_type, food_amount, vet_practice, vet_address, vet_phone, info, photo, updated_at)
  on public.dogs to authenticated;
create policy dogs_select on public.dogs for select to authenticated using (public.is_dog_member(id));
create policy dogs_insert on public.dogs for insert to authenticated with check (owner_id = auth.uid());
create policy dogs_update on public.dogs for update to authenticated
  using (public.is_dog_member(id)) with check (public.is_dog_member(id));
create policy dogs_delete on public.dogs for delete to authenticated using (owner_id = auth.uid());

grant select, delete on public.dog_members to authenticated;
create policy members_select on public.dog_members for select to authenticated using (public.is_dog_member(dog_id));
-- Nur die Besitzerperson entfernt Personen.
create policy members_delete on public.dog_members for delete to authenticated using (public.is_dog_owner(dog_id));

grant select, insert, delete on public.dog_invites to authenticated;
create policy invites_select on public.dog_invites for select to authenticated
  using (public.is_dog_owner(dog_id) or email = public.my_email());
-- Nur die Besitzerperson lädt ein.
create policy invites_insert on public.dog_invites for insert to authenticated
  with check (public.is_dog_owner(dog_id) and invited_by = auth.uid() and email <> public.my_email());
create policy invites_delete on public.dog_invites for delete to authenticated
  using (public.is_dog_owner(dog_id) or email = public.my_email());

grant select, insert, delete on public.day_entries to authenticated;
grant update (items, weight_kg, note, deleted, updated_at) on public.day_entries to authenticated;
create policy entries_select on public.day_entries for select to authenticated using (public.is_dog_member(dog_id));
create policy entries_insert on public.day_entries for insert to authenticated with check (public.is_dog_member(dog_id));
create policy entries_update on public.day_entries for update to authenticated
  using (public.is_dog_member(dog_id)) with check (public.is_dog_member(dog_id));
create policy entries_delete on public.day_entries for delete to authenticated using (public.is_dog_member(dog_id));

grant select, insert, delete on public.custom_items to authenticated;
create policy custom_select on public.custom_items for select to authenticated using (user_id = auth.uid());
create policy custom_insert on public.custom_items for insert to authenticated with check (user_id = auth.uid());
create policy custom_delete on public.custom_items for delete to authenticated using (user_id = auth.uid());

-------------------------------------------------------------------------------
-- Funktionen für die App
-------------------------------------------------------------------------------

-- Tageseintrag speichern: die neuere Änderung gewinnt. Gibt immer den gültigen Stand zurück.
create function public.upsert_day_entry(
  p_id uuid, p_dog_id uuid, p_date date, p_items jsonb, p_weight_kg numeric, p_note text, p_deleted boolean, p_updated_at timestamptz
) returns public.day_entries
language plpgsql security invoker set search_path = ''
as $$
declare
  result public.day_entries;
begin
  insert into public.day_entries as e (id, dog_id, date, items, weight_kg, note, deleted, updated_at)
  values (p_id, p_dog_id, p_date, p_items, p_weight_kg, p_note, p_deleted, p_updated_at)
  on conflict (dog_id, date) do update
    set items = excluded.items, weight_kg = excluded.weight_kg, note = excluded.note,
        deleted = excluded.deleted, updated_at = excluded.updated_at
    where e.updated_at < excluded.updated_at
  returning * into result;
  if result.id is null then
    select * into result from public.day_entries where dog_id = p_dog_id and date = p_date;
  end if;
  return result;
end $$;

-- Hund anlegen oder ändern: die neuere Änderung gewinnt.
create function public.upsert_dog(
  p_id uuid, p_name text, p_birthday date, p_breed text, p_medication text, p_food_type text, p_food_amount text,
  p_vet_practice text, p_vet_address text, p_vet_phone text, p_info text, p_photo text, p_created_at timestamptz,
  p_updated_at timestamptz
) returns public.dogs
language plpgsql security invoker set search_path = ''
as $$
declare
  result public.dogs;
begin
  if exists (select 1 from public.dogs where id = p_id) then
    update public.dogs d
       set name = p_name, birthday = p_birthday, breed = p_breed, medication = p_medication, food_type = p_food_type,
           food_amount = p_food_amount, vet_practice = p_vet_practice, vet_address = p_vet_address, vet_phone = p_vet_phone,
           info = p_info, photo = p_photo, updated_at = p_updated_at
     where d.id = p_id and d.updated_at < p_updated_at;
  else
    insert into public.dogs (id, owner_id, name, birthday, breed, medication, food_type, food_amount, vet_practice,
                             vet_address, vet_phone, info, photo, created_at, updated_at)
    values (p_id, auth.uid(), p_name, p_birthday, p_breed, p_medication, p_food_type, p_food_amount, p_vet_practice,
            p_vet_address, p_vet_phone, p_info, p_photo, coalesce(p_created_at, now()), p_updated_at);
  end if;
  select * into result from public.dogs where id = p_id;
  if result.id is null then
    raise exception 'Kein Zugriff auf diesen Hund' using errcode = '42501';
  end if;
  return result;
end $$;

-- Offene Einladungen an die eigene E-Mail-Adresse (mit Hundename und wer eingeladen hat).
create function public.my_invites()
returns table (id uuid, dog_id uuid, dog_name text, invited_by_name text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select i.id, i.dog_id, d.name, coalesce(nullif(p.display_name, ''), p.email), i.created_at
    from public.dog_invites i
    join public.dogs d on d.id = i.dog_id
    left join public.profiles p on p.id = i.invited_by
   where i.email = public.my_email() and auth.uid() is not null
   order by i.created_at
$$;

-- Einladung annehmen: nur mit passender E-Mail-Adresse.
create function public.accept_invite(p_invite uuid) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  inv public.dog_invites;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  select * into inv from public.dog_invites where id = p_invite and email = public.my_email();
  if inv.id is null then
    raise exception 'Einladung nicht gefunden' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.dogs where id = inv.dog_id and owner_id = auth.uid()) then
    insert into public.dog_members (dog_id, user_id) values (inv.dog_id, auth.uid()) on conflict do nothing;
  end if;
  delete from public.dog_invites where id = inv.id;
  return inv.dog_id;
end $$;

-- Personen eines Hundes (Besitzerperson zuerst). Nur für Personen, die den Hund sehen dürfen.
create function public.dog_people(p_dog uuid)
returns table (user_id uuid, display_name text, email text, role text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.display_name, p.email, 'owner'
    from public.dogs d join public.profiles p on p.id = d.owner_id
   where d.id = p_dog and public.is_dog_member(p_dog)
  union all
  select * from (
    select p.id, p.display_name, p.email, 'member'
      from public.dog_members m join public.profiles p on p.id = m.user_id
     where m.dog_id = p_dog and public.is_dog_member(p_dog)
     order by m.created_at
  ) x
$$;

-- Konto löschen. Geteilte Hunde gehen an die Person über, die am längsten mitverwaltet.
-- Hunde ohne weitere Personen werden mit allen Einträgen gelöscht.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  d record;
  heir uuid;
begin
  if uid is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;
  for d in select id from public.dogs where owner_id = uid loop
    select user_id into heir from public.dog_members where dog_id = d.id order by created_at, user_id limit 1;
    if heir is null then
      delete from public.dogs where id = d.id;
    else
      update public.dogs set owner_id = heir where id = d.id;
      delete from public.dog_members where dog_id = d.id and user_id = heir;
      delete from public.dog_invites where dog_id = d.id;
    end if;
  end loop;
  delete from auth.users where id = uid;
end $$;

revoke all on function public.upsert_day_entry, public.upsert_dog, public.my_invites, public.accept_invite,
  public.dog_people, public.delete_my_account, public.is_dog_owner, public.is_dog_member, public.shares_dog_with,
  public.my_email, public.handle_new_user, public.touch_server_updated_at, public.touch_day_entry
  from public, anon;
grant execute on function public.upsert_day_entry, public.upsert_dog, public.my_invites, public.accept_invite,
  public.dog_people, public.delete_my_account, public.is_dog_owner, public.is_dog_member, public.shares_dog_with,
  public.my_email
  to authenticated;
