const fs = require('fs');
const path = require('path');
const profiles = require('./profiles');

// Aktivierungscode für VIP - wird vom Nutzer separat mitgeteilt und hier hinterlegt,
// bis dahin ist die Aktivierung informativ deaktiviert (kein Zahlungssystem nötig).
const VIP_ACTIVATION_CODE = null;

const TIERS = { GUEST: 'guest', FREE: 'free', VIP: 'vip' };

// Limits & Kosten. Free-Kontingent resettet sich täglich um 0 Uhr (lokale Zeit).
const GUEST_MESSAGE_LIMIT = 150;
const FREE_MESSAGE_LIMIT = 150;
const FREE_STARTING_COINS = 100;
const COIN_COST_PER_SKILL = 10;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Setzt den Tageszähler zurück, sobald der gespeicherte Tag nicht mehr "heute" ist.
function applyDailyReset(account) {
  const today = todayKey();
  if (account.lastResetDay !== today) {
    account.messageCount = 0;
    account.errorStreak = 0;
    account.lastResetDay = today;
  }
  return account;
}

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
  'type_password',        // AES-256 Passwort-Tresor
  'toggle_network_sniper', // Netzwerk-Sniper
  'research_topic',       // KI-Forschungs-Drohne
  'toggle_ghost_protocol', // Ghost Protocol
  'deep_diagnostics',     // Tiefendiagnose
  'cleanup_protocol',     // Protokoll Bereinigung
  'summarize_clipboard',  // Inhalts-Zusammenfasser
  'toggle_gaming_mode',   // Gaming Mode (manuell per Sprachbefehl)
]);

let guestSession = null; // { messageCount: 0 } - rein im Arbeitsspeicher, kein Login nötig

function accountFile(profileId) {
  const dir = profileId ? profiles.getProfileDir(profileId) : profiles.getActiveProfileDir();
  return path.join(dir, 'account.json');
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

function getProfileAccount(profileId) {
  const defaults = { tier: TIERS.FREE, coins: FREE_STARTING_COINS, messageCount: 0, errorStreak: 0, lastResetDay: todayKey() };
  const account = { ...defaults, ...readJson(accountFile(profileId), {}) };
  return applyDailyReset(account);
}

function saveProfileAccount(account, profileId) {
  writeJson(accountFile(profileId), account);
  return account;
}

// Setzt die Kontostufe für ein bestimmtes Profil (oder das aktive, falls keins angegeben) -
// genutzt vom Admin-Panel, um anderen lokalen Konten VIP zu geben/entziehen.
function setTier(tier, profileId) {
  const account = getProfileAccount(profileId);
  account.tier = tier;
  saveProfileAccount(account, profileId);
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
    return { allowed: false, reason: `Sie haben Ihr tägliches Kontingent von ${FREE_MESSAGE_LIMIT} Antworten erreicht, Sir. Um Mitternacht setzt es sich zurück, oder werden Sie VIP für unbegrenzte Antworten.` };
  }
  return { allowed: true };
}

// isSystemError: true, wenn die Antwort ein echter Systemfehler war (z.B. kein API-Key,
// KI-Anbieter nicht erreichbar) - NICHT bei normalen Antworten, in denen die KI lediglich
// über ein Problem berichtet. Der ERSTE Systemfehler in Folge zählt nicht gegen das
// Kontingent; wiederholt der Nutzer dieselbe fehlschlagende Aktion trotzdem weiter, zählt
// ab dem zweiten Mal jede weitere Antwort ganz normal (mit Warnhinweis an den Aufrufer).
function recordMessage(isSystemError = false) {
  if (guestSession) {
    guestSession.messageCount += 1;
    return { counted: true, warned: false };
  }
  const account = getProfileAccount();

  if (isSystemError) {
    account.errorStreak = (account.errorStreak || 0) + 1;
    if (account.errorStreak <= 1) {
      saveProfileAccount(account);
      return { counted: false, warned: false };
    }
    account.messageCount = (account.messageCount || 0) + 1;
    saveProfileAccount(account);
    return { counted: true, warned: true };
  }

  account.errorStreak = 0;
  account.messageCount = (account.messageCount || 0) + 1;
  saveProfileAccount(account);
  return { counted: true, warned: false };
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

// Überschreibt das Konto des aktiven Profils komplett - genutzt beim Wiederherstellen
// einer Cloud-Momentaufnahme (z.B. nach Neuinstallation), nicht im normalen Betrieb.
function restoreAccount(data) {
  saveProfileAccount(data);
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
  getProfileAccount,
  setTier,
  restoreAccount,
};
