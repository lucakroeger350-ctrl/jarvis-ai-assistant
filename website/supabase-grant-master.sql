-- Master Account für lucakroeger350@gmail.com (Entwickler-Account) - erst ausführen,
-- NACHDEM du dich mit dieser Adresse registriert und die Bestätigungsmail angeklickt hast
-- (sonst existiert noch kein passender auth.users-Eintrag).
--
-- ERSETZT die alte Version dieser Datei: die schrieb noch in ein längst abgelöstes
-- jsonb "account"-Feld, das seit der Cloud-Migration (is_vip/ai_credits als eigene
-- Spalten) nirgends mehr gelesen wird - der Master-Status kam dadurch nie tatsächlich an.
--
-- is_master schaltet zusätzlich künftige DLCs automatisch mit frei (siehe
-- core/dlc-manager.js), ohne dass dieses Skript für jedes neue DLC erneut angepasst
-- werden müsste - is_vip/has_mobile_addon werden hier trotzdem direkt gesetzt, damit
-- alle bestehenden Freischalt-Prüfungen (gemini-proxy, mobile-transcribe, Handy-Login
-- usw.) sofort greifen, ohne auf Code zu warten, das extra nach is_master fragt.
update profiles
set
  is_vip = true,
  is_master = true,
  has_mobile_addon = true,
  ai_credits = 999999,
  has_dlc_hud_customizer = true,
  has_dlc_ironman = true,
  has_dlc_matrix = true,
  has_dlc_vaporwave = true,
  has_dlc_arctic = true,
  has_dlc_wakesounds = true,
  has_dlc_report = true,
  has_widget_chronos_core = true
where id = (select id from auth.users where email = 'lucakroeger350@gmail.com');
