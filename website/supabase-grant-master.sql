-- Erst ausführen, NACHDEM du dich mit lucakroeger350@gmail.com registriert und die
-- Bestätigungsmail angeklickt hast (sonst existiert noch kein passender auth.users-Eintrag).

insert into profiles (id, email, account, is_master)
select id, email,
  jsonb_build_object('tier', 'vip', 'coins', 0, 'messageCount', 0, 'errorStreak', 0, 'lastResetDay', to_char(now(), 'YYYY-MM-DD')),
  true
from auth.users
where email = 'lucakroeger350@gmail.com'
on conflict (id) do update
  set account = profiles.account || jsonb_build_object('tier', 'vip'),
      is_master = true;
