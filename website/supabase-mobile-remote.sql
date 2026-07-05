-- Jarvis Mobile Command: Realtime-Pipeline zwischen Mobile-App (Handy) und Electron-App (PC).
-- pc_remote_commands: Handy schreibt Befehle, PC hört per Realtime zu und führt sie aus.
-- pc_telemetry: PC schreibt alle 5s CPU/GPU/RAM (+ optional Snapshot bei unbefugtem Zugriff),
-- Handy liest per Realtime mit. Danach im Supabase SQL-Editor ausführen.

create table if not exists pc_remote_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending | done | error
  result text,
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

alter table pc_remote_commands enable row level security;

-- Nutzer sieht/schreibt NUR eigene Befehle (Handy legt an, PC liest/aktualisiert - beide
-- laufen unter derselben auth.uid(), da Electron dieselbe Supabase-Session nutzt).
drop policy if exists "own commands select" on pc_remote_commands;
create policy "own commands select" on pc_remote_commands for select using (auth.uid() = user_id);
drop policy if exists "own commands insert" on pc_remote_commands;
create policy "own commands insert" on pc_remote_commands for insert with check (auth.uid() = user_id);
drop policy if exists "own commands update" on pc_remote_commands;
create policy "own commands update" on pc_remote_commands for update using (auth.uid() = user_id);

-- Nur die neuesten Telemetriedaten pro Nutzer nötig (Dashboard zeigt "Live"-Werte) -
-- ein einzelner, ständig überschriebener Datensatz statt einer wachsenden Historie.
create table if not exists pc_telemetry (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cpu_load integer,
  ram_percent integer,
  cpu_temp numeric,
  gpu_load integer,
  security_snapshot text, -- Base64-JPEG, NUR bei erkanntem unbefugtem Zugriff gefüllt (siehe security-guard.js)
  security_alert boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table pc_telemetry enable row level security;

drop policy if exists "own telemetry select" on pc_telemetry;
create policy "own telemetry select" on pc_telemetry for select using (auth.uid() = user_id);
drop policy if exists "own telemetry upsert" on pc_telemetry;
create policy "own telemetry upsert" on pc_telemetry for insert with check (auth.uid() = user_id);
drop policy if exists "own telemetry update" on pc_telemetry;
create policy "own telemetry update" on pc_telemetry for update using (auth.uid() = user_id);

-- Alte, bereits abgearbeitete Befehle regelmäßig aufräumen, damit die Tabelle nicht
-- unbegrenzt wächst (der PC muss ohnehin nur "pending" abfragen).
create or replace function cleanup_old_remote_commands()
returns void
language plpgsql
security definer
as $$
begin
  delete from pc_remote_commands where status <> 'pending' and handled_at < now() - interval '7 days';
end;
$$;

select cron.schedule('cleanup-remote-commands', '0 3 * * *', $$select cleanup_old_remote_commands();$$);

-- WICHTIG: Tabellen senden erst dann Live-Updates an .on('postgres_changes', ...)-Abos
-- (Handy-Dashboard/PC-Fernsteuerung), wenn sie explizit zur Realtime-Publikation
-- hinzugefügt wurden - das war hier bisher nicht der Fall (Ursache für "keine
-- PC-Telemetrie im Handy-Dashboard trotz laufender PC-App"). In einem DO-Block, damit
-- erneutes Ausführen nicht mit "already member of publication" fehlschlägt.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pc_remote_commands') then
    alter publication supabase_realtime add table pc_remote_commands;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pc_telemetry') then
    alter publication supabase_realtime add table pc_telemetry;
  end if;
end $$;
