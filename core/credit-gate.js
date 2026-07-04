// Überwacht per Supabase Realtime, ob dem Nutzer die Credits ausgehen (oder VIP wird),
// und informiert die UI live - ohne dass JARVIS neu gestartet werden muss.
const { createClient } = require('@supabase/supabase-js');
const cloudAuth = require('./cloud-auth');
const dlcManager = require('./dlc-manager');

let sendFn = null;
let client = null;
let channel = null;
let locked = false;

function init(send) {
  sendFn = send;
}

function isLocked() {
  return locked;
}

function applyStatus(row) {
  const shouldLock = !row.is_vip && (row.ai_credits ?? 0) <= 0;
  if (shouldLock !== locked) {
    locked = shouldLock;
    if (sendFn) sendFn(locked ? 'credits:locked' : 'credits:unlocked', {});
  }
  dlcManager.applyProfileFlags(row);
}

async function startWatching(session) {
  stopWatching();
  if (!session) return;

  client = createClient(cloudAuth.SUPABASE_URL, cloudAuth.SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 2 } },
  });
  await client.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken });

  // select('*') statt einzelner Spalten, damit neue DLC-Spalten automatisch mitkommen,
  // ohne diese Abfrage bei jedem neuen DLC anpassen zu müssen.
  const { data: profile } = await client.from('profiles').select('*').eq('id', session.userId).maybeSingle();
  if (profile) applyStatus(profile);

  channel = client
    .channel(`profile-${session.userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.userId}` }, (payload) => {
      applyStatus(payload.new);
    })
    .subscribe();
}

function stopWatching() {
  if (channel && client) client.removeChannel(channel);
  channel = null;
  client = null;
  locked = false;
}

module.exports = { init, startWatching, stopWatching, isLocked };
