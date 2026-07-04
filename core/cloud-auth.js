// Supabase Auth (GoTrue) über die REST-API - bewusst ohne @supabase/supabase-js-SDK,
// konsistent mit core/bug-report.js und core/shared-learnings.js (reines fetch()).

const SUPABASE_URL = 'https://mhlldrhhbuskszmdwedp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1obGxkcmhoYnVza3N6bWR3ZWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwOTQxNTMsImV4cCI6MjA5ODY3MDE1M30.-jnRCUQD3-7n_eSQJk6p2Gl5mLoBRYUzXI_smkr7pyQ';
// Ohne explizites Ziel würde der Bestätigungslink auf die im Supabase-Dashboard
// hinterlegte "Site URL" zeigen (Standard: localhost) - JARVIS läuft aber nicht als
// Webserver, deshalb auf die echte Website (Dossier-Seite) umleiten.
const EMAIL_REDIRECT_TO = 'https://website-three-pied-22.vercel.app/dossier';

async function gotrueRequest(pathAndQuery, body) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/${pathAndQuery}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Keine Verbindung zur Cloud - Login/Registrierung benötigt eine Internetverbindung.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.msg || data.error_description || data.error || 'Cloud-Anmeldung fehlgeschlagen.');
  return data;
}

function toSession(data) {
  if (!data.access_token) return null; // z.B. wenn E-Mail-Bestätigung noch aussteht
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
    userId: data.user.id,
    email: data.user.email,
  };
}

// Gibt bei aktivierter E-Mail-Bestätigung KEINE Session zurück (data.session === null) -
// der Aufrufer muss dann den Nutzer auf die Bestätigungsmail hinweisen.
async function register(email, password) {
  const data = await gotrueRequest('signup', { email, password, options: { email_redirect_to: EMAIL_REDIRECT_TO } });
  return toSession(data) || { pendingEmailConfirmation: true, email };
}

async function login(email, password) {
  const data = await gotrueRequest('token?grant_type=password', { email, password });
  return toSession(data);
}

async function refresh(refreshToken) {
  const data = await gotrueRequest('token?grant_type=refresh_token', { refresh_token: refreshToken });
  return toSession(data);
}

module.exports = { register, login, refresh, SUPABASE_URL, SUPABASE_ANON_KEY };
