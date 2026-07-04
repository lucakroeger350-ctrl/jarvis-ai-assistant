-- Erweitert die profiles-Tabelle um das Pay-as-you-go-Guthabensystem.
-- Danach im Supabase SQL-Editor ausführen (nach den vorherigen 4 Skripten).

alter table profiles add column if not exists is_vip boolean not null default false;
alter table profiles add column if not exists ai_credits integer not null default 150;

-- DLC-Freischaltungen: jedes künftige DLC bekommt genau so eine boolean-Spalte
-- "has_dlc_<name>", die der Stripe-Webhook nach erfolgreichem Kauf auf true setzt.
alter table profiles add column if not exists has_dlc_hud_customizer boolean not null default false;

-- Verhindert doppelte Gutschriften, falls Stripe dasselbe Webhook-Event mehrfach zustellt
-- (garantiert "at least once", nicht "exactly once").
create table if not exists processed_stripe_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

-- Atomarer, race-condition-sicherer Credit-Verbrauch (statt "lesen, -1 rechnen, schreiben"
-- aus der App, was bei zwei gleichzeitigen Anfragen Credits verschenken könnte).
create or replace function consume_credit(uid uuid)
returns integer
language plpgsql
security definer
as $$
declare
  remaining integer;
begin
  update profiles
  set ai_credits = ai_credits - 1
  where id = uid and ai_credits > 0
  returning ai_credits into remaining;
  return remaining;
end;
$$;

-- Legt automatisch eine profiles-Zeile an, sobald sich jemand neu registriert (egal ob
-- über die Website oder die App) - ohne das würde der KI-Proxy für reine Website-
-- Registrierungen ohne App-Login "Kein Profil gefunden" melden.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, ai_credits)
  values (new.id, new.email, 150)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Atomares Aufladen (Stripe-Webhook) - verhindert, dass zwei schnell aufeinanderfolgende
-- Webhook-Aufrufe (z.B. bei Stripe-Retries) sich gegenseitig überschreiben statt zu addieren.
create or replace function add_credits(uid uuid, amount integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_total integer;
begin
  update profiles
  set ai_credits = ai_credits + amount
  where id = uid
  returning ai_credits into new_total;
  return new_total;
end;
$$;
