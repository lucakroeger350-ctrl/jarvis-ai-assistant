-- Im Supabase SQL-Editor einmalig ausführen (zusätzlich zu supabase-bug-reports.sql).
-- Speichert anonymisierte "beigebrachte Kommandos" (Trigger -> Aktion), die JARVIS-Nutzer
-- opt-in miteinander teilen, damit sich alle JARVIS-Installationen gegenseitig verbessern.
-- Absichtlich KEINE personenbezogenen Daten (keine E-Mail, kein Name, kein Gerätebezug).

create table if not exists shared_learnings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  trigger text not null,
  action text not null
);

alter table shared_learnings enable row level security;

-- Jeder darf neue Erkenntnisse einreichen UND alle bisherigen lesen (das ist der Sinn:
-- geteiltes Wissen). Niemand darf fremde Einträge ändern/löschen.
create policy "Anyone can submit a shared learning"
  on shared_learnings for insert
  to anon
  with check (true);

create policy "Anyone can read shared learnings"
  on shared_learnings for select
  to anon
  using (true);
