const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const profiles = require('./profiles');

function vaultFile() {
  return path.join(profiles.getActiveProfileDir(), 'password-vault.json');
}

function readState() {
  const file = vaultFile();
  if (!fs.existsSync(file)) return { pinHash: null, pinSalt: null, entries: [] };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { pinHash: null, pinSalt: null, entries: [] };
  }
}

function writeState(state) {
  fs.writeFileSync(vaultFile(), JSON.stringify(state, null, 2), 'utf-8');
}

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 64).toString('hex');
}

// Getrennte Schlüsselableitung von der PIN-Prüfsumme, damit ein evtl. geleakter
// pinHash nicht direkt Rückschlüsse auf den AES-Schlüssel erlaubt.
function deriveKey(pin, salt) {
  return crypto.scryptSync(pin, salt + ':vaultkey', 32);
}

function setPin(pin) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN muss aus 4-8 Ziffern bestehen.');
  const state = readState();
  if (state.entries.length) throw new Error('PIN kann nicht geändert werden, solange Einträge im Tresor liegen (würde sie unlesbar machen). Bitte erst alle Einträge löschen.');
  const salt = crypto.randomBytes(16).toString('hex');
  state.pinSalt = salt;
  state.pinHash = hashPin(pin, salt);
  writeState(state);
  return true;
}

function verifyPin(pin) {
  const state = readState();
  if (!state.pinHash) return false;
  return hashPin(pin, state.pinSalt) === state.pinHash;
}

function hasPin() {
  return !!readState().pinHash;
}

function listEntries() {
  const state = readState();
  return state.entries.map((e) => ({ id: e.id, label: e.label, username: e.username }));
}

function addEntry(pin, label, username, password) {
  if (!verifyPin(pin)) throw new Error('Falsche PIN.');
  const state = readState();
  const key = deriveKey(pin, state.pinSalt);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(password, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    label,
    username,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
  };
  state.entries.push(entry);
  writeState(state);
  return { id: entry.id, label: entry.label, username: entry.username };
}

function decryptPassword(pin, id) {
  if (!verifyPin(pin)) throw new Error('Falsche PIN.');
  const state = readState();
  const entry = state.entries.find((e) => e.id === id);
  if (!entry) throw new Error('Eintrag nicht gefunden.');
  const key = deriveKey(pin, state.pinSalt);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(entry.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(entry.authTag, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(entry.ciphertext, 'hex')), decipher.final()]);
  return plaintext.toString('utf-8');
}

function findByLabel(query) {
  const state = readState();
  const lower = query.trim().toLowerCase();
  return state.entries.find((e) => e.label.toLowerCase().includes(lower));
}

function deleteEntry(pin, id) {
  if (!verifyPin(pin)) throw new Error('Falsche PIN.');
  const state = readState();
  state.entries = state.entries.filter((e) => e.id !== id);
  writeState(state);
  return true;
}

module.exports = { setPin, verifyPin, hasPin, listEntries, addEntry, decryptPassword, findByLabel, deleteEntry };
