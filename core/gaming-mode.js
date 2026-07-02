const si = require('systeminformation');
const { exec } = require('child_process');
const account = require('./account');

// Bekannte Spiele-Prozesse, nach denen periodisch gesucht wird.
const GAME_PROCESSES = [
  { match: /valorant-win64-shipping/i, name: 'Valorant' },
  { match: /^valorant\.exe$/i, name: 'Valorant' },
  { match: /^csgo\.exe$/i, name: 'Counter-Strike' },
  { match: /^cs2\.exe$/i, name: 'Counter-Strike 2' },
  { match: /leagueclient/i, name: 'League of Legends' },
  { match: /^dota2\.exe$/i, name: 'Dota 2' },
  { match: /^r5apex\.exe$/i, name: 'Apex Legends' },
  { match: /fortniteclient-win64-shipping/i, name: 'Fortnite' },
  { match: /^eldenring\.exe$/i, name: 'Elden Ring' },
  { match: /^gta5\.exe$/i, name: 'GTA V' },
  { match: /^overwatch\.exe$/i, name: 'Overwatch' },
  { match: /^rocketleague\.exe$/i, name: 'Rocket League' },
  { match: /^minecraft/i, name: 'Minecraft' },
];

// Nicht-essenzielle RAM-Fresser, die beim Aktivieren geschlossen werden.
// Discord/Spotify bewusst ausgenommen (werden beim Zocken oft aktiv gebraucht).
const BACKGROUND_APPS_TO_CLOSE = ['chrome.exe', 'msedge.exe', 'Slack.exe', 'Teams.exe', 'OneDrive.exe'];

let notifiedProcess = null;
let pending = null; // { gameName }
let pendingTimeout = null;
let overlayActive = false;

function closeBackgroundApps() {
  for (const exeName of BACKGROUND_APPS_TO_CLOSE) {
    exec(`taskkill /IM "${exeName}" /F`, () => {});
  }
}

function clearPending() {
  pending = null;
  if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
}

// Wird alle 15s aufgerufen; onDetected(gameName) informiert den Nutzer per Sprache/Log.
function startWatcher(onDetected) {
  setInterval(async () => {
    if (account.getAccountState().tier !== account.TIERS.VIP) return;
    if (overlayActive || pending) return;
    try {
      const data = await si.processes();
      const match = GAME_PROCESSES.find((g) => data.list.some((p) => g.match.test(p.name)));
      if (match && match.name !== notifiedProcess) {
        notifiedProcess = match.name;
        pending = { gameName: match.name };
        pendingTimeout = setTimeout(clearPending, 20000);
        onDetected(match.name);
      } else if (!match) {
        notifiedProcess = null;
      }
    } catch {
      // stille Fehlbehandlung - Spiel-Erkennung ist nicht kritisch
    }
  }, 15000);
}

// Prüft, ob eine eingehende Chat-Nachricht die Antwort auf eine offene Ja/Nein-Frage ist.
// Gibt { consumed, action } zurück - "consumed" heißt: nicht mehr an die KI weiterleiten.
function respondToPrompt(text) {
  if (!pending) return { consumed: false };
  const gameName = pending.gameName;
  const t = (text || '').trim().toLowerCase();
  clearPending();

  if (/^(ja|yes|klar|jo|mach das|gerne)/.test(t)) {
    return { consumed: true, action: 'enter', gameName };
  }
  if (/^(nein|no|nicht|lass)/.test(t)) {
    return { consumed: true, action: 'dismiss', gameName };
  }
  return { consumed: false };
}

function setOverlayActive(active) {
  overlayActive = active;
}

module.exports = { startWatcher, respondToPrompt, closeBackgroundApps, setOverlayActive };
