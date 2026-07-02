const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { shell } = require('electron');
const profiles = require('./profiles');
const integrations = require('./integrations');

const REDIRECT_URI = 'http://127.0.0.1:43682/callback';
const SCOPES = 'user-modify-playback-state user-read-playback-state';

function tokenFile() {
  return path.join(profiles.getActiveProfileDir(), 'spotify-token.json');
}

function readToken() {
  const file = tokenFile();
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

function writeToken(token) {
  fs.writeFileSync(tokenFile(), JSON.stringify(token, null, 2), 'utf-8');
}

function base64Url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// PKCE-Flow: kein Client-Secret nötig (sicher für Desktop-Apps, da nichts geheim
// gehalten werden muss - der code_verifier existiert nur temporär im Speicher).
async function authorize() {
  const clientId = integrations.get().spotify.clientId;
  if (!clientId) throw new Error('Keine Spotify Client-ID hinterlegt. Bitte in den Einstellungen unter VIP eintragen.');

  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('scope', SCOPES);

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== '/callback') { res.end(); return; }
      const authCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body style="background:#060606;color:#ff5722;font-family:monospace;text-align:center;padding-top:80px;">Verbindung erfolgreich, Sir. Sie können dieses Fenster schließen.</body></html>');
      server.close();
      if (error) reject(new Error(error));
      else resolve(authCode);
    });
    server.listen(43682);
    setTimeout(() => { server.close(); reject(new Error('Zeitüberschreitung bei der Spotify-Anmeldung.')); }, 120000);
    shell.openExternal(authUrl.href);
  });

  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  const data = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(data.error_description || 'Spotify-Anmeldung fehlgeschlagen.');

  writeToken({ ...data, obtainedAt: Date.now() });
  return true;
}

async function refreshIfNeeded() {
  const token = readToken();
  if (!token) return null;
  const expired = Date.now() > token.obtainedAt + (token.expires_in - 60) * 1000;
  if (!expired) return token.access_token;

  const clientId = integrations.get().spotify.clientId;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token, client_id: clientId }),
  });
  const data = await res.json();
  if (!res.ok) return null;
  writeToken({ ...token, ...data, obtainedAt: Date.now() });
  return data.access_token;
}

function isConnected() {
  return !!readToken();
}

module.exports = { authorize, refreshIfNeeded, isConnected };
