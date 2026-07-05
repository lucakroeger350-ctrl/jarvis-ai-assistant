-- Jarvis Mobile Command Add-on (+5€/Monat zusätzlich zum VIP-Abo): Freischalt-Spalte,
-- Rückwärts-Kanal PC->Handy ("Handy suchen") und Gamification (Tages-Streak/V-Coins-Bonus).
-- Danach im Supabase SQL-Editor ausführen.

alter table profiles add column if not exists has_mobile_addon boolean not null default false;

-- Symmetrisch zu pc_remote_commands (website/supabase-mobile-remote.sql), nur umgekehrte
-- Richtung: der PC schreibt (z.B. "Jarvis, wo ist mein Handy?"), das Handy hört per Realtime.
create table if not exists phone_remote_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  handled_at timestamptz
);

alter table phone_remote_commands enable row level security;

drop policy if exists "own phone commands select" on phone_remote_commands;
create policy "own phone commands select" on phone_remote_commands for select using (auth.uid() = user_id);
drop policy if exists "own phone commands insert" on phone_remote_commands;
create policy "own phone commands insert" on phone_remote_commands for insert with check (auth.uid() = user_id);
drop policy if exists "own phone commands update" on phone_remote_commands;
create policy "own phone commands update" on phone_remote_commands for update using (auth.uid() = user_id);

-- Ohne das hier hört core/remote-control.js#sendPhoneCommand ("Handy suchen" etc.) nie
-- live mit - siehe ausführliche Erklärung in supabase-mobile-remote.sql.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'phone_remote_commands') then
    alter publication supabase_realtime add table phone_remote_commands;
  end if;
end $$;

-- Tages-Streak + V-Coins-Bonus: rein mobiler Nutzungsanreiz, ein Claim pro Kalendertag.
create table if not exists mobile_gamification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak integer not null default 0,
  last_claim_day date
);

alter table mobile_gamification enable row level security;

drop policy if exists "own gamification select" on mobile_gamification;
create policy "own gamification select" on mobile_gamification for select using (auth.uid() = user_id);

-- security definer: schreibt v_coins/streak unabhängig von RLS, aber NUR für den Aufrufer
-- selbst (auth.uid() wird serverseitig aus dem JWT genommen, nicht vom Client übergeben -
-- verhindert, dass ein Nutzer den Bonus für eine fremde user_id claimt).
create or replace function claim_daily_bonus()
returns table(new_streak integer, bonus integer, v_coins integer)
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
  today date := current_date;
  row_streak integer;
  row_last date;
  computed_bonus integer;
begin
  insert into mobile_gamification (user_id, streak, last_claim_day)
  values (uid, 0, null)
  on conflict (user_id) do nothing;

  select streak, last_claim_day into row_streak, row_last from mobile_gamification where user_id = uid;

  if row_last = today then
    -- bereits heute geclaimt - kein zweiter Bonus, aktuellen Stand zurückgeben
    select v_coins into v_coins from profiles where id = uid;
    return query select row_streak, 0, v_coins;
  end if;

  if row_last = today - 1 then
    row_streak := row_streak + 1;
  else
    row_streak := 1; -- Streak gerissen oder erster Claim
  end if;

  computed_bonus := 5 + least(row_streak, 10);

  update mobile_gamification set streak = row_streak, last_claim_day = today where user_id = uid;
  update profiles set v_coins = v_coins + computed_bonus where id = uid returning v_coins into v_coins;

  return query select row_streak, computed_bonus, v_coins;
end;
$$;
