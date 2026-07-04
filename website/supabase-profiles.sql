-- Im Supabase SQL-Editor einmalig ausführen (zusätzlich zu den beiden anderen Skripten).
-- Speichert die vollständigen JARVIS-Profildaten (Einstellungen, Erinnerungen, gelernte
-- Skills, Konto-/VIP-Status) pro Supabase-Auth-Nutzer - überlebt eine Neuinstallation.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  settings jsonb not null default '{}'::jsonb,
  memory jsonb not null default '{"facts":[]}'::jsonb,
  learned_skills jsonb not null default '{"skills":[]}'::jsonb,
  account jsonb not null default '{}'::jsonb,
  is_master boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Jeder Nutzer darf NUR seine eigene Zeile lesen/schreiben (auth.uid() = id) - dadurch
-- kann niemand an die Daten eines anderen Nutzers kommen, auch nicht über die API.
create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);
