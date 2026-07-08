-- Fairere KI-Abrechnung: Credits werden jetzt proportional zum tatsächlichen Token-
-- Verbrauch abgezogen (Eingabe-/Ausgabe-Tokens unterschiedlich gewichtet, wie bei echten
-- KI-APIs inkl. Claude - Ausgabe-Tokens sind dort üblicherweise ~5x teurer als Eingabe-
-- Tokens), statt bisher pauschal 1 Credit pro abgeschlossener Frage unabhängig vom
-- tatsächlichen Aufwand. Siehe website/app/api/gemini-proxy/route.ts für die Berechnung.
-- Danach im Supabase SQL-Editor ausführen (nach supabase-credits.sql).

-- ai_credits von integer auf numeric erweitert - verlustfreie Erweiterung, bestehende
-- Ganzzahl-Guthaben bleiben unverändert, erlaubt aber ab jetzt Nachkommastellen
-- (z.B. 147.35 statt zwangsweise nur ganze Einheiten).
alter table profiles alter column ai_credits type numeric using ai_credits::numeric;

-- amount jetzt frei wählbar (statt immer genau 1) - ruft der Proxy pro KI-Anfrage mit den
-- tatsächlich verbrauchten, gewichteten Tokens auf.
create or replace function consume_credit(uid uuid, amount numeric default 1)
returns numeric
language plpgsql
security definer
as $$
declare
  remaining numeric;
begin
  update profiles
  set ai_credits = ai_credits - amount
  where id = uid and ai_credits > 0
  returning ai_credits into remaining;
  return remaining;
end;
$$;

create or replace function add_credits(uid uuid, amount numeric)
returns numeric
language plpgsql
security definer
as $$
declare
  new_total numeric;
begin
  update profiles
  set ai_credits = ai_credits + amount
  where id = uid
  returning ai_credits into new_total;
  return new_total;
end;
$$;
