const { exec } = require('child_process');
const { minimizeAllWindows } = require('./night-protocol');
const { setMuted } = require('./system-toggles');
const visualizerBridge = require('./visualizer-bridge');

// Öffnet best-effort ein Word- oder Excel-Fenster als Tarnung. Schlägt beides fehl
// (z.B. kein Office installiert), wird das stillschweigend übersprungen - die
// Tarnung darf nicht an einer fehlenden Anwendung scheitern.
function openDecoyDocument() {
  exec('start winword', (err) => {
    if (err) exec('start excel', () => {});
  });
}

// Boss-Key / Tarnmodus: läuft bewusst lautlos (keine Sprachausgabe), da der ganze
// Sinn ist, unauffällig zu bleiben.
async function activateStealthMode() {
  await minimizeAllWindows();
  await setMuted(true).catch(() => {});
  openDecoyDocument();
  visualizerBridge.send('stealth:log', { text: '[STEALTH]: Ghost protocol activated' });
  return true;
}

module.exports = { activateStealthMode };
