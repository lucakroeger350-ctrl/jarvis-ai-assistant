const { exec } = require('child_process');
const { measurePing } = require('./network-speed');

// Nicht-essenzielle Bandbreiten-Fresser, die bei Ping-Spikes gedrosselt werden.
const THROTTLE_APPS = ['chrome.exe', 'msedge.exe', 'OneDrive.exe', 'Teams.exe', 'svchost.exe'];
const PING_SPIKE_MS = 100; // Anstieg gegenüber dem gleitenden Referenzwert, der als "Spike" zählt

// WICHTIG: New-NetQosPolicy setzt eine lokale Windows-QoS-Richtlinie (Gruppenrichtlinien-
// basiert) und benötigt in der Regel Administratorrechte. Schlägt das Setzen fehl (z.B. ohne
// Admin-Rechte gestartet), wird der Spike trotzdem erkannt und gemeldet, nur ohne echte Drosselung.
function applyThrottle() {
  THROTTLE_APPS.forEach((exe) => {
    const name = `Jarvis-Throttle-${exe}`;
    exec(`powershell -NoProfile -Command "New-NetQosPolicy -Name '${name}' -AppPathNameMatchCondition '${exe}' -ThrottleRateActionBytesPerSecond 51200 -PolicyStore ActiveStore -ErrorAction SilentlyContinue"`);
  });
}

function removeThrottle() {
  exec(`powershell -NoProfile -Command "Get-NetQosPolicy -Name 'Jarvis-Throttle-*' -ErrorAction SilentlyContinue | Remove-NetQosPolicy -Confirm:$false -ErrorAction SilentlyContinue"`);
}

let watcherInterval = null;
let baselinePing = null;
let throttled = false;

function startWatcher(onEvent) {
  if (watcherInterval) return;
  watcherInterval = setInterval(async () => {
    try {
      const ping = await measurePing();
      if (baselinePing === null) { baselinePing = ping; return; }

      const spike = ping - baselinePing > PING_SPIKE_MS;
      if (spike && !throttled) {
        throttled = true;
        applyThrottle();
        onEvent('throttle-on', ping);
      } else if (!spike && throttled) {
        throttled = false;
        removeThrottle();
        onEvent('throttle-off', ping);
      }
      // gleitender Referenzwert, damit sich der "Normalzustand" langsam an das aktuelle Netz anpasst
      baselinePing = baselinePing * 0.8 + ping * 0.2;
    } catch {
      // stille Fehlbehandlung - Ping-Messung ist nicht kritisch
    }
  }, 10000);
}

function stopWatcher() {
  if (watcherInterval) { clearInterval(watcherInterval); watcherInterval = null; }
  if (throttled) { removeThrottle(); throttled = false; }
  baselinePing = null;
}

function isActive() {
  return !!watcherInterval;
}

module.exports = { startWatcher, stopWatcher, isActive };
