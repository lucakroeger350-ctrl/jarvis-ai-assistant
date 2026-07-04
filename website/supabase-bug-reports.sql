-- Im Supabase SQL-Editor (dein Projekt -> SQL Editor -> New query) einmalig ausführen.

create table if not exists bug_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  description text not null,
  app_version text,
  os_info text,
  user_email text,
  status text not null default 'open' -- 'open' | 'in_progress' | 'fixed'
);

alter table bug_reports enable row level security;

-- Erlaubt jedem (auch mit dem öffentlichen anon-Key) NUR das Einfügen neuer Reports,
-- niemals das Lesen/Ändern/Löschen fremder Einträge - das bleibt dir im Dashboard
-- vorbehalten (dort bist du als Projekt-Owner ohnehin nicht an RLS gebunden).
create policy "Anyone can submit a bug report"
  on bug_reports for insert
  to anon
  with check (true);
