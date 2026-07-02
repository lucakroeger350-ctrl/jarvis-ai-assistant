// Community-trainiertes "Jarvis"-Stimmenmodell (Piper TTS) - klingt deutlich mehr nach
// dem echten JARVIS als Windows' eingebaute Stimmen. Läuft komplett lokal/kostenlos,
// Binary + Modell werden beim ersten Gebrauch einmalig heruntergeladen und dann zwischengespeichert.

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { spawn } = require('child_process');
const { app } = require('electron');
const extractZip = require('extract-zip');

const PIPER_DIR = path.join(app.getPath('userData'), 'piper');
const PIPER_EXE = path.join(PIPER_DIR, 'piper', 'piper.exe');
const MODEL_PATH = path.join(PIPER_DIR, 'jarvis-medium.onnx');
const CONFIG_PATH = path.join(PIPER_DIR, 'jarvis-medium.onnx.json');

const PIPER_ZIP_URL = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_windows_amd64.zip';
const MODEL_URL = 'https://huggingface.co/jgkawell/jarvis/resolve/main/en/en_GB/jarvis/medium/jarvis-medium.onnx';
const CONFIG_URL = 'https://huggingface.co/jgkawell/jarvis/resolve/main/en/en_GB/jarvis/medium/jarvis-medium.onnx.json';

function ensureDir() {
  if (!fs.existsSync(PIPER_DIR)) fs.mkdirSync(PIPER_DIR, { recursive: true });
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl, redirectsLeft) => {
      https.get(requestUrl, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
          // Location kann relativ sein (z.B. Hugging Face) - gegen die aktuelle URL auflösen.
          const nextUrl = new URL(res.headers.location, requestUrl).href;
          doRequest(nextUrl, redirectsLeft - 1);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download fehlgeschlagen (${res.statusCode}): ${requestUrl}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const file = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress && total) onProgress(received / total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
        file.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url, 5);
  });
}

async function ensurePiperInstalled(onProgress) {
  ensureDir();

  if (!fs.existsSync(PIPER_EXE)) {
    if (onProgress) onProgress('Lade Piper-Engine herunter...');
    const zipPath = path.join(PIPER_DIR, 'piper.zip');
    await downloadFile(PIPER_ZIP_URL, zipPath);
    await extractZip(zipPath, { dir: PIPER_DIR });
    fs.unlinkSync(zipPath);
  }

  if (!fs.existsSync(MODEL_PATH)) {
    if (onProgress) onProgress('Lade JARVIS-Stimmenmodell herunter...');
    await downloadFile(MODEL_URL, MODEL_PATH);
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    await downloadFile(CONFIG_URL, CONFIG_PATH);
  }
}

function synthesize(text) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(PIPER_EXE)) {
      reject(new Error('Piper ist noch nicht installiert.'));
      return;
    }
    const outPath = path.join(os.tmpdir(), `jarvis-tts-${Date.now()}.wav`);
    const proc = spawn(PIPER_EXE, [
      '--model', MODEL_PATH,
      '--config', CONFIG_PATH,
      '--output_file', outPath,
    ], { windowsHide: true, cwd: path.dirname(PIPER_EXE) });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('exit', (code) => {
      if (code === 0 && fs.existsSync(outPath)) resolve(outPath);
      else reject(new Error(stderr.trim() || `Piper beendete sich mit Code ${code}`));
    });
    proc.on('error', reject);

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

function isInstalled() {
  return fs.existsSync(PIPER_EXE) && fs.existsSync(MODEL_PATH) && fs.existsSync(CONFIG_PATH);
}

module.exports = { ensurePiperInstalled, synthesize, isInstalled };
