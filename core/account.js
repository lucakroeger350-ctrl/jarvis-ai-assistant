const fs = require('fs');
const path = require('path');
const profiles = require('./profiles');

// Aktivierungscode für VIP - wird vom Nutzer separat mitgeteilt und hier hinterlegt,
// bis dahin ist die Aktivierung informativ deaktiviert (kein Zahlungssystem nötig).
const VIP_ACTIVATION_CODE = null;

const TIERS = { GUEST: 'guest', FREE: 'free', VIP: 'vip' };

// Limits & Kosten - bewusst einfach gehalten (Lifetime-Zähler, kein Reset-Intervall),
// da noch kein Zahlungssystem existiert. Später leicht auf z.B. monatlichen Reset umstellbar.
const GUEST_MESSAGE_LIMIT = 150;
const FREE_MESSAGE_LIMIT = 500;
const FREE_STARTING_COINS = 100;
const COIN_COST_PER_SKILL = 10;

// Module, die laut der offiziellen Free/VIP-Feature-Liste hinter der VIP-Stufe stehen.
// Für Gäste komplett gesperrt, für kostenlose Konten kosten sie Coins, für VIP unbegrenzt.
// Alles, was NICHT hier drin ist, ist für registrierte kostenlose Nutzer frei nutzbar.
const VIP_SKILLS = new Set([
  'night_protocol',       // Night Protocol (filmreifer Shutdown)
  'scan_network',         // WLAN-Wächter (Subnetz-Scanner)
  'world_time',           // Weltzeit-Globus-Widget
  'toggle_music_visualizer', // Musik-Schnittstelle & Oszilloskop
  'start_meeting_recording', // Meeting-Aufnahme (nicht in der Liste explizit genannt, als Premium-Automation eingestuft)
  'summarize_meeting',
  'toggle_camera_guard', // Matrix-Kamera-Schutz
  'play_music',          // Musik-Schnittstelle & Oszilloskop
  'activate_stealth_mode', // Boss-Key / Tarnmodus
]);

let guestSession = null; // { messageCount: 0 } - rein im Arbeitsspeicher, kein Login nötig

function accountFile() {
  return path.join(profiles.getActiveProfileDir(), 'account.json');
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function getProfileAccount() {
  const defaults = { tier: TIERS.FREE, coins: FREE_STARTING_COINS, messageCount: 0 };
  return { ...defaults, ...readJson(accountFile(), {}) };
}

function saveProfileAccount(account) {
  writeJson(accountFile(), account);
  return account;
}

function startGuestSession() {
  guestSession = { messageCount: 0 };
}

function endGuestSession() {
  guestSession = null;
}

function isGuestSession() {
  return !!guestSession;
}

function getAccountState() {
  if (guestSession) {
    return { tier: TIERS.GUEST, coins: 0, messageCount: guestSession.messageCount, messageLimit: GUEST_MESSAGE_LIMIT };
  }
  const account = getProfileAccount();
  const messageLimit = account.tier === TIERS.VIP ? Infinity : FREE_MESSAGE_LIMIT;
  return { ...account, messageLimit };
}

function canSendMessage() {
  const state = getAccountState();
  if (state.tier === TIERS.VIP) return { allowed: true };
  if (state.messageCount >= state.messageLimit) {
    if (state.tier === TIERS.GUEST) {
      return { allowed: false, reason: `Sie haben Ihr Kontingent von ${GUEST_MESSAGE_LIMIT} Fragen als Gast erreicht, Sir. Bitte melden Sie sich an, um weiterzusprechen und Module nutzen zu können.` };
    }
    return { allowed: false, reason: `Sie haben Ihr Kontingent von ${FREE_MESSAGE_LIMIT} Fragen erreicht, Sir. Werden Sie VIP, um unbegrenzt weiterzusprechen.` };
  }
  return { allowed: true };
}

function recordMessage() {
  if (guestSession) {
    guestSession.messageCount += 1;
    return;
  }
  const account = getProfileAccount();
  account.messageCount = (account.messageCount || 0) + 1;
  saveProfileAccount(account);
}

function canUseSkill(skillName) {
  if (!VIP_SKILLS.has(skillName)) return { allowed: true };

  const state = getAccountState();
  if (state.tier === TIERS.VIP) return { allowed: true };
  if (state.tier === TIERS.GUEST) {
    return { allowed: false, reason: 'Dieses Modul steht Gästen nicht zur Verfügung. Bitte melden Sie sich an, Sir.' };
  }
  // kostenloses Konto: kostet Coins
  const account = getProfileAccount();
  if ((account.coins || 0) < COIN_COST_PER_SKILL) {
    return { allowed: false, reason: `Nicht genügend Coins für dieses Modul (${COIN_COST_PER_SKILL} benötigt, ${account.coins || 0} vorhanden). Werden Sie VIP für unbegrenzten Zugriff, Sir.` };
  }
  return { allowed: true, cost: COIN_COST_PER_SKILL };
}

function spendCoins(amount) {
  const account = getProfileAccount();
  account.coins = Math.max(0, (account.coins || 0) - amount);
  saveProfileAccount(account);
  return account.coins;
}

function activateVip(code) {
  if (!VIP_ACTIVATION_CODE) {
    return { ok: false, error: 'Für VIP ist noch kein Aktivierungscode hinterlegt. Diese Funktion folgt in Kürze.' };
  }
  if (code !== VIP_ACTIVATION_CODE) {
    return { ok: false, error: 'Ungültiger Aktivierungscode.' };
  }
  const account = getProfileAccount();
  account.tier = TIERS.VIP;
  saveProfileAccount(account);
  return { ok: true };
}

module.exports = {
  TIERS,
  GUEST_MESSAGE_LIMIT,
  FREE_MESSAGE_LIMIT,
  COIN_COST_PER_SKILL,
  startGuestSession,
  endGuestSession,
  isGuestSession,
  getAccountState,
  canSendMessage,
  recordMessage,
  canUseSkill,
  spendCoins,
  activateVip,
};
