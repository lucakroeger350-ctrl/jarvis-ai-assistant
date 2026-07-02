const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const visualizerBridge = require('./visualizer-bridge');

function dirSize(dir) {
  let total = 0;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
    } catch {
      // gesperrte/verschwundene Datei - überspringen
    }
  }
  return total;
}

function clearTemp() {
  const tempDir = os.tmpdir();
  let entries;
  try { entries = fs.readdirSync(tempDir); } catch { return []; }
  const removed = [];
  for (const name of entries) {
    // eigene, aktuell genutzte JARVIS-Skripte nicht mit anfassen
    if (name.startsWith('jarvis-')) continue;
    try {
      fs.rmSync(path.join(tempDir, name), { recursive: true, force: true });
      removed.push(name);
    } catch {
      // Datei ist gerade in Benutzung - überspringen statt abzubrechen
    }
  }
  return removed;
}

function emptyRecycleBin() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', () => resolve());
  });
}

async function runCleanupProtocol() {
  const tempDir = os.tmpdir();
  const beforeSize = dirSize(tempDir);

  const removedFiles = clearTemp();
  // Nur die ersten ~40 Zeilen als schnell durchratterndes Log anzeigen, den Rest still verarbeiten.
  removedFiles.slice(0, 40).forEach((name) => {
    visualizerBridge.send('cleanup:log-line', { text: `[BEREINIGT] ${name}` });
  });

  await emptyRecycleBin();
  visualizerBridge.send('cleanup:log-line', { text: '[BEREINIGT] Papierkorb geleert' });

  const afterSize = dirSize(tempDir);
  const freedMb = Math.max(0, Math.round(((beforeSize - afterSize) / (1024 * 1024)) * 10) / 10);
  return { freedMb, filesRemoved: removedFiles.length };
}

module.exports = { runCleanupProtocol };
