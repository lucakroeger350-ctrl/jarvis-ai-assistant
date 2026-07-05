-- Jarvis Mobile Command: SOS-Panic-Protokoll + Intruder-Defense (src/mobile/lib/sos.ts,
-- src/mobile/lib/intruder-defense.ts). Danach im Supabase SQL-Editor ausführen.

-- Ein aktiver Datensatz pro Nutzer, wird während eines laufenden SOS-Alarms alle paar
-- Sekunden mit der aktuellen Position überschrieben (kein Verlauf nötig - "wo ist er JETZT").
create table if not exists sos_events (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default false,
  latitude double precision,
  longitude double precision,
  audio_url text,
  updated_at timestamptz not null default now()
);

alter table sos_events enable row level security;
drop policy if exists "own sos select" on sos_events;
create policy "own sos select" on sos_events for select using (auth.uid() = user_id);
drop policy if exists "own sos upsert" on sos_events;
create policy "own sos upsert" on sos_events for insert with check (auth.uid() = user_id);
drop policy if exists "own sos update" on sos_events;
create policy "own sos update" on sos_events for update using (auth.uid() = user_id);

-- Protokoll erkannter Fremdzugriffe (Intruder-Defense) - ein Eintrag pro Alarm, mit Foto.
create table if not exists intruder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table intruder_events enable row level security;
drop policy if exists "own intruder select" on intruder_events;
create policy "own intruder select" on intruder_events for select using (auth.uid() = user_id);
drop policy if exists "own intruder insert" on intruder_events;
create policy "own intruder insert" on intruder_events for insert with check (auth.uid() = user_id);

-- Storage-Buckets (im Supabase Dashboard unter Storage anlegen, falls das SQL-Editor-
-- Insert unten aufgrund fehlender Owner-Rechte fehlschlägt): "sos-audio" und
-- "intruder-captures", beide PRIVATE (kein Public-Zugriff).
insert into storage.buckets (id, name, public) values ('sos-audio', 'sos-audio', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('intruder-captures', 'intruder-captures', false) on conflict (id) do nothing;

drop policy if exists "own sos audio" on storage.objects;
create policy "own sos audio" on storage.objects for all
  using (bucket_id = 'sos-audio' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'sos-audio' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "own intruder captures" on storage.objects;
create policy "own intruder captures" on storage.objects for all
  using (bucket_id = 'intruder-captures' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'intruder-captures' and auth.uid()::text = (storage.foldername(name))[1]);
