const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const profiles = require('./profiles');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
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

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function getAccounts() {
  return readJson(ACCOUNTS_FILE, { accounts: [] }).accounts;
}

function saveAccounts(accounts) {
  writeJson(ACCOUNTS_FILE, { accounts });
}

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function toPublic(account) {
  return { id: account.id, email: account.email, displayName: account.displayName, profileId: account.profileId };
}

function register(email, password, displayName) {
  const norm = normalizeEmail(email);
  if (!norm || !password) throw new Error('E-Mail und Passwort werden benötigt.');
  const accounts = getAccounts();
  if (accounts.some((a) => a.email === norm)) throw new Error('Für diese E-Mail existiert bereits ein Konto.');

  const name = displayName && displayName.trim() ? displayName.trim() : norm;

  // Erste Registrierung nach der Einführung von Konten: das bereits bestehende
  // Profil (mit allen bisherigen Einstellungen) übernehmen statt ein leeres neues anzulegen.
  const existingProfiles = profiles.listProfiles();
  let profileId;
  if (accounts.length === 0 && existingProfiles.length === 1) {
    profileId = existingProfiles[0].id;
    profiles.renameProfile(profileId, name);
  } else {
    profileId = profiles.createProfile(name).id;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const account = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email: norm,
    displayName: name,
    salt,
    passwordHash: hashPassword(password, salt),
    profileId,
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveAccounts(accounts);

  profiles.switchProfile(profileId);
  writeJson(SESSION_FILE, { accountId: account.id });

  return toPublic(account);
}

function login(email, password) {
  const norm = normalizeEmail(email);
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email === norm);
  if (!account) throw new Error('Kein Konto mit dieser E-Mail gefunden.');

  const hash = hashPassword(password, account.salt);
  if (hash !== account.passwordHash) throw new Error('Falsches Passwort.');

  profiles.switchProfile(account.profileId);
  writeJson(SESSION_FILE, { accountId: account.id });

  return toPublic(account);
}

function logout() {
  writeJson(SESSION_FILE, {});
}

function getSession() {
  const session = readJson(SESSION_FILE, {});
  if (!session.accountId) return null;
  const accounts = getAccounts();
  const account = accounts.find((a) => a.id === session.accountId);
  if (!account) return null;

  profiles.switchProfile(account.profileId);
  return toPublic(account);
}

module.exports = { register, login, logout, getSession };
