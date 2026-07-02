const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const profiles = require('./profiles');

function guardFile() {
  return path.join(profiles.getActiveProfileDir(), 'security-guard.json');
}

function readState() {
  const file = guardFile();
  if (!fs.existsSync(file)) return { pinHash: null, pinSalt: null, descriptor: null, enabled: false };
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { pinHash: null, pinSalt: null, descriptor: null, enabled: false };
  }
}

function writeState(state) {
  fs.writeFileSync(guardFile(), JSON.stringify(state, null, 2), 'utf-8');
}

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 64).toString('hex');
}

function setPin(pin) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN muss aus 4-8 Ziffern bestehen.');
  const salt = crypto.randomBytes(16).toString('hex');
  const state = readState();
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

function saveDescriptor(descriptorArray) {
  const state = readState();
  state.descriptor = descriptorArray;
  writeState(state);
  return true;
}

function getDescriptor() {
  return readState().descriptor;
}

const MATCH_THRESHOLD = 0.6;

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

// Vergleicht einen live erfassten Gesichts-Deskriptor mit dem hinterlegten.
// true = bekanntes Gesicht (kein Alarm), false = unbekannt (Lockdown auslösen).
function checkDescriptor(liveDescriptor) {
  const stored = getDescriptor();
  if (!stored || !liveDescriptor) return true;
  return euclideanDistance(stored, liveDescriptor) < MATCH_THRESHOLD;
}

function setEnabled(enabled) {
  const state = readState();
  state.enabled = enabled;
  writeState(state);
  return state;
}

function getStatus() {
  const state = readState();
  return {
    hasPin: !!state.pinHash,
    hasFace: !!state.descriptor,
    enabled: !!state.enabled,
  };
}

// Bewaffnungsstatus (armed = aktiv überwachend) lebt nur im Arbeitsspeicher des
// Hauptprozesses - startet nach jedem Neustart deaktiviert.
let armed = false;
function setArmed(value) { armed = value; }
function isArmed() { return armed; }

module.exports = {
  setPin,
  verifyPin,
  saveDescriptor,
  getDescriptor,
  checkDescriptor,
  setEnabled,
  getStatus,
  setArmed,
  isArmed,
};
