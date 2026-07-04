const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const profiles = require('./profiles');
const cloudAuth = require('./cloud-auth');
const cloudSync = require('./cloud-sync');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json'); // lokale userId->Profil-Zuordnung, KEINE Passwörter mehr
const SESSION_FILE = path.join(DATA_DIR, 'session.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(file, fallback) {
  ensureDataDir();
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function getLocalAccounts() {
  const accounts = readJson(ACCOUNTS_FILE, { accounts: [] }).accounts;
  // Altlasten aus dem früheren rein-lokalen Passwort-System (Feld "passwordHash") sind mit
  // dem Wechsel auf Cloud-Auth ungültig geworden und dürfen die "bestehendes Profil
  // übernehmen"-Logik unten nicht blockieren - herausfiltern statt danach zu matchen.
  return accounts.filter((a) => !a.passwordHash);
}

function saveLocalAccounts(accounts) {
  writeJson(ACCOUNTS_FILE, { accounts });
}

function toPublic(entry) {
  return { id: entry.id, email: entry.email, displayName: entry.displayName, profileId: entry.profileId };
}

// Findet die lokale Profil-Zuordnung für einen Cloud-Nutzer, oder legt (mit
// isFresh=true) ein neues lokales Profil an - z.B. nach einer Neuinstallation, bei der
// die lokale Zuordnungsdatei nicht mehr existiert, obwohl das Cloud-Konto schon besteht.
function resolveLocalProfile(userId, email, displayName) {
  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.id === userId);
  if (existing) return { profileId: existing.profileId, isFresh: false, accounts };

  const name = displayName && displayName.trim() ? displayName.trim() : email;

  // Erste Cloud-Migration eines bereits bestehenden lokalen (Alt-)Profils: das einzige
  // vorhandene Profil übernehmen statt ein leeres neues anzulegen.
  const existingProfiles = profiles.listProfiles();
  let profileId;
  if (accounts.length === 0 && existingProfiles.length === 1) {
    profileId = existingProfiles[0].id;
    profiles.renameProfile(profileId, name);
  } else {
    profileId = profiles.createProfile(name).id;
  }

  return { profileId, isFresh: true, accounts };
}

function saveSession(session) {
  writeJson(SESSION_FILE, session);
}

async function register(email, password, displayName) {
  const norm = normalizeEmail(email);
  if (!norm || !password) throw new Error('E-Mail und Passwort werden benötigt.');

  const result = await cloudAuth.register(norm, password);
  if (result.pendingEmailConfirmation) {
    throw new Error('Bestätigungs-Link wurde an Ihre E-Mail-Adresse gesendet. Bitte E-Mails prüfen und den Link anklicken, danach anmelden.');
  }

  const { profileId, isFresh, accounts } = resolveLocalProfile(result.userId, result.email, displayName);
  accounts.push({ id: result.userId, email: result.email, displayName: displayName || result.email, profileId });
  saveLocalAccounts(accounts);

  profiles.switchProfile(profileId);
  await cloudSync.syncOnLogin(result.accessToken, result.userId, result.email, displayName, isFresh).catch(() => {});

  saveSession({ ...result, profileId, displayName: displayName || result.email });
  return toPublic({ id: result.userId, email: result.email, displayName: displayName || result.email, profileId });
}

async function login(email, password) {
  const norm = normalizeEmail(email);
  const result = await cloudAuth.login(norm, password);

  const { profileId, isFresh, accounts } = resolveLocalProfile(result.userId, result.email, null);
  if (!accounts.some((a) => a.id === result.userId)) {
    accounts.push({ id: result.userId, email: result.email, displayName: result.email, profileId });
    saveLocalAccounts(accounts);
  }

  profiles.switchProfile(profileId);
  await cloudSync.syncOnLogin(result.accessToken, result.userId, result.email, null, isFresh).catch(() => {});

  const localEntry = getLocalAccounts().find((a) => a.id === result.userId);
  saveSession({ ...result, profileId, displayName: localEntry ? localEntry.displayName : result.email });
  return toPublic({ id: result.userId, email: result.email, displayName: localEntry ? localEntry.displayName : result.email, profileId });
}

function logout() {
  writeJson(SESSION_FILE, {});
}

function listAccounts() {
  return getLocalAccounts().map(toPublic);
}

// Öffentliche, IPC-sichere Session (keine Tokens) - für die Renderer-Seite.
function getSession() {
  const session = readJson(SESSION_FILE, {});
  if (!session.userId) return null;
  profiles.switchProfile(session.profileId);
  return toPublic({ id: session.userId, email: session.email, displayName: session.displayName, profileId: session.profileId });
}

// Vollständige Session inkl. Cloud-Tokens - NUR für main.js/interne Sync-Aufrufe, nie
// über IPC an den Renderer weitergeben.
async function getFullSession() {
  const session = readJson(SESSION_FILE, {});
  if (!session.userId) return null;

  if (Date.now() > session.expiresAt - 60000) {
    try {
      const refreshed = await cloudAuth.refresh(session.refreshToken);
      const merged = { ...session, ...refreshed };
      saveSession(merged);
      return merged;
    } catch {
      return null; // Refresh fehlgeschlagen - Sitzung gilt als abgelaufen
    }
  }
  return session;
}

module.exports = { register, login, logout, getSession, getFullSession, listAccounts };
