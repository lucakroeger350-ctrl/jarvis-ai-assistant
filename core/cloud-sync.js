const memory = require('./memory');
const account = require('./account');
const cloudAuth = require('./cloud-auth');

const { SUPABASE_URL, SUPABASE_ANON_KEY } = cloudAuth;

function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
}

// Baut eine vollständige Momentaufnahme des aktuell aktiven lokalen Profils.
function buildSnapshot(email, displayName) {
  return {
    email,
    display_name: displayName,
    settings: memory.getSettings(),
    memory: memory.getMemory(),
    learned_skills: memory.getLearnedSkills(),
    account: account.getProfileAccount(),
    updated_at: new Date().toISOString(),
  };
}

// Schreibt eine Cloud-Momentaufnahme in die lokalen Profildateien (z.B. nach
// Neuinstallation, wenn lokal noch nichts vorhanden ist).
function applySnapshot(snapshot) {
  if (snapshot.settings) memory.restoreSettings(snapshot.settings);
  if (snapshot.memory) memory.restoreMemory(snapshot.memory);
  if (snapshot.learned_skills) memory.restoreLearnedSkills(snapshot.learned_skills);
  if (snapshot.account) account.restoreAccount(snapshot.account);
}

async function pushProfile(accessToken, userId, email, displayName) {
  const snapshot = buildSnapshot(email, displayName);
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, ...snapshot }),
  });
  return snapshot;
}

async function pullProfile(accessToken, userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

// Entscheidet beim Login, wessen Stand gewinnt. Bewusst simple, sichere Heuristik statt
// Feld-für-Feld-Merging: NUR ein gerade erst neu angelegtes lokales Profil (frische
// Installation, z.B. nach Neuinstallation/Datenverlust) bekommt den Cloud-Stand übergestülpt.
// Ein bereits auf diesem Gerät genutztes Profil bleibt lokal führend und schiebt seinen
// Stand stattdessen hoch - so kann ein veralteter Cloud-Stand niemals frische lokale
// Änderungen überschreiben.
async function syncOnLogin(accessToken, userId, email, displayName, isFreshLocalProfile) {
  const cloud = await pullProfile(accessToken, userId).catch(() => null);

  if (isFreshLocalProfile && cloud) {
    applySnapshot(cloud);
    return { direction: 'pulled' };
  }

  await pushProfile(accessToken, userId, email, displayName).catch(() => {});
  return { direction: 'pushed' };
}

module.exports = { buildSnapshot, applySnapshot, pushProfile, pullProfile, syncOnLogin };
