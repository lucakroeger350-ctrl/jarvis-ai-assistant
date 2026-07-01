const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const FILE = path.join(DATA_DIR, 'integrations.json');

const DEFAULTS = {
  emailjs: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function get() {
  ensureDataDir();
  if (!fs.existsSync(FILE)) return DEFAULTS;
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    return { emailjs: { ...DEFAULTS.emailjs, ...(saved.emailjs || {}) } };
  } catch {
    return DEFAULTS;
  }
}

function save(config) {
  ensureDataDir();
  const merged = { emailjs: { ...DEFAULTS.emailjs, ...(config.emailjs || {}) } };
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

module.exports = { get, save };
