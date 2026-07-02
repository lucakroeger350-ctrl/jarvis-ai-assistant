const { setMuted, setMicMuted, setCameraAccessBlocked, pauseMedia } = require('./system-toggles');
const visualizerBridge = require('./visualizer-bridge');

// Discord-Status automatisiert auf "Bitte nicht stören" setzen würde bedeuten, das normale
// Nutzerkonto über eine inoffizielle Schnittstelle fernzusteuern ("Selfbot") - das verstößt
// gegen Discords Nutzungsbedingungen und riskiert eine Kontosperre. Wird deshalb bewusst NICHT
// umgesetzt; alle anderen Ghost-Protocol-Schritte laufen wie beschrieben.
async function activateGhostProtocol() {
  await setMuted(true).catch(() => {});
  await setMicMuted(true).catch(() => {});
  pauseMedia();
  setCameraAccessBlocked(true);
  visualizerBridge.send('ghost:state-changed', { active: true });
  visualizerBridge.send('stealth:log', { text: '[GHOST]: Ghost protocol activated.' });
  return true;
}

async function deactivateGhostProtocol() {
  await setMuted(false).catch(() => {});
  await setMicMuted(false).catch(() => {});
  setCameraAccessBlocked(false);
  visualizerBridge.send('ghost:state-changed', { active: false });
  visualizerBridge.send('stealth:log', { text: '[GHOST]: Ghost protocol deactivated.' });
  return true;
}

module.exports = { activateGhostProtocol, deactivateGhostProtocol };
