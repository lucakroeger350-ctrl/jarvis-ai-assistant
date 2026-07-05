-- Jarvis Mobile Command: Smart Recall & geofenced Erinnerungen (src/mobile/lib/reminders.ts).
-- type = 'time'     -> target_time gesetzt, wird als lokale Gerätebenachrichtigung geplant
-- type = 'location' -> latitude/longitude/radius gesetzt, Handy prüft beim Öffnen der App
--                      bzw. während des Vordergrund-Trackings, ob der Radius betreten wurde
-- type = 'parking'  -> Sonderfall der "Merk-Funktion" (Parkplatz merken), latitude/longitude
--                      gesetzt, kein radius/target_time nötig
-- Danach im Supabase SQL-Editor ausführen.

create table if not exists mobile_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  type text not null check (type in ('time', 'location', 'parking')),
  target_time timestamptz,
  latitude double precision,
  longitude double precision,
  radius integer, -- Meter, nur bei type = 'location'
  triggered boolean not null default false,
  created_at timestamptz not null default now()
);

alter table mobile_reminders enable row level security;

drop policy if exists "own reminders select" on mobile_reminders;
create policy "own reminders select" on mobile_reminders for select using (auth.uid() = user_id);
drop policy if exists "own reminders insert" on mobile_reminders;
create policy "own reminders insert" on mobile_reminders for insert with check (auth.uid() = user_id);
drop policy if exists "own reminders update" on mobile_reminders;
create policy "own reminders update" on mobile_reminders for update using (auth.uid() = user_id);
drop policy if exists "own reminders delete" on mobile_reminders;
create policy "own reminders delete" on mobile_reminders for delete using (auth.uid() = user_id);

-- Ausgelöste Zeit-Erinnerungen regelmäßig aufräumen (Parkplatz/Location-Erinnerungen
-- werden von der App selbst per delete verwaltet, wenn sie verbraucht/ersetzt werden).
create or replace function cleanup_old_reminders()
returns void
language plpgsql
security definer
as $$
begin
  delete from mobile_reminders where type = 'time' and triggered = true and target_time < now() - interval '7 days';
end;
$$;

select cron.schedule('cleanup-mobile-reminders', '0 4 * * *', $$select cleanup_old_reminders();$$);
