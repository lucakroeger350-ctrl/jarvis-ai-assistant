const fs = require('fs');
const path = require('path');
const https = require('https');
const { app } = require('electron');

const MODELS_DIR = path.join(app.getPath('userData'), 'face-models');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(new URL(res.headers.location, url).href, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download fehlgeschlagen (${res.statusCode}): ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

function isInstalled() {
  return FILES.every((f) => fs.existsSync(path.join(MODELS_DIR, f)));
}

async function ensureModelsDownloaded(onProgress) {
  if (isInstalled()) return MODELS_DIR;
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true });

  for (let i = 0; i < FILES.length; i++) {
    const file = FILES[i];
    if (onProgress) onProgress(`Lade Gesichtserkennungs-Modell (${i + 1}/${FILES.length})...`);
    await downloadFile(BASE_URL + file, path.join(MODELS_DIR, file));
  }
  return MODELS_DIR;
}

module.exports = { ensureModelsDownloaded, isInstalled, MODELS_DIR };
