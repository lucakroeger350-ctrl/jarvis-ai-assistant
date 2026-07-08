-- Admin-Panel (nur für is_master-Accounts, siehe website/app/admin): Feature-Wünsche
-- (analog zu bug_reports) + ein Umsatz-Log mit echten Beträgen. Danach im Supabase
-- SQL-Editor ausführen.

create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  user_email text,
  status text not null default 'open' -- 'open' | 'planned' | 'done' | 'declined'
);

alter table feature_requests enable row level security;

drop policy if exists "Anyone can submit a feature request" on feature_requests;
create policy "Anyone can submit a feature request"
  on feature_requests for insert
  to anon
  with check (true);
-- Bewusst KEINE Select-Policy - Lesen/Bearbeiten läuft ausschließlich über die
-- service_role-gestützte Admin-API (website/app/api/admin/*), die is_master serverseitig
-- neu prüft, exakt wie bei bug_reports.

-- Umsatz-Log MIT echten Beträgen (im Gegensatz zum bewusst anonymisierten, öffentlichen
-- activity_log aus supabase-activity-log.sql) - deshalb KEINE Public-Read-Policy, nur über
-- die Admin-API einsehbar. "Monatsumsatz" wird nicht aktiv zurückgesetzt, sondern beim
-- Anzeigen einfach nach created_at >= Monatsanfang gefiltert - so bleibt die komplette
-- Historie erhalten, statt sie durch einen Reset zu verlieren.
create table if not exists revenue_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null, -- z.B. 'vip_subscribed', 'credits_refilled', 'dlc_purchased:...'
  amount_cents integer not null,
  currency text not null default 'eur'
);

alter table revenue_log enable row level security;
-- Bewusst KEINE Policies überhaupt - Insert läuft nur über den Stripe-Webhook
-- (service_role-Key), Lesen nur über die Admin-API (ebenfalls service_role-Key).
