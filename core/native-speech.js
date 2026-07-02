const { spawn } = require('child_process');
const path = require('path');

// In der gepackten App liegen .ps1-Skripte im "asarUnpack"-Ordner, da powershell.exe
// (ein externer Prozess) nicht auf Dateien innerhalb des app.asar-Archivs zugreifen kann.
// Der reale Pfad ist dann .../app.asar.unpacked/... statt .../app.asar/...
function resolveNativePath(...segments) {
  const p = path.join(__dirname, '..', ...segments);
  return p.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
}

const FILE_SCRIPT_PATH = resolveNativePath('native', 'recognize-file.ps1');

// Wird für die Meeting-Zusammenfassung genutzt (Transkription einer aufgezeichneten WAV-Datei).
// Die eigentliche Sprachsteuerung (Push-to-Talk) läuft über Whisper, siehe core/whisper-stt.js.
function transcribeFile(wavPath, culture = 'de-DE') {
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', FILE_SCRIPT_PATH,
      '-Path', wavPath,
      '-Culture', culture,
    ], { windowsHide: true });

    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('exit', () => {
      const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'transcript') return resolve(msg.text);
          if (msg.type === 'error') return reject(new Error(msg.message));
        } catch {
          // ignore
        }
      }
      reject(new Error('Keine Transkription erhalten.'));
    });
    proc.on('error', reject);
  });
}

module.exports = { transcribeFile };
