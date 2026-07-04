const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DATA_DIR = path.join(app.getPath('userData'), 'data');
const PROFILES_DIR = path.join(DATA_DIR, 'profiles');
const INDEX_FILE = path.join(DATA_DIR, 'profiles-index.json');
const CONFIG_FILE = path.join(DATA_DIR, 'app-config.json');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });
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

function slugId(name) {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'profil';
  return base + '-' + Math.random().toString(36).slice(2, 6);
}

function migrateLegacyDataIfNeeded() {
  ensureDirs();
  if (fs.existsSync(INDEX_FILE)) return; // schon migriert

  const legacyFiles = ['settings.json', 'memory.json', 'learned-skills.json', 'calendar.json'];
  const hasLegacyData = legacyFiles.some((f) => fs.existsSync(path.join(DATA_DIR, f)));

  const defaultId = 'default';
  const defaultDir = path.join(PROFILES_DIR, defaultId);
  if (!fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir, { recursive: true });

  if (hasLegacyData) {
    for (const f of legacyFiles) {
      const src = path.join(DATA_DIR, f);
      if (fs.existsSync(src)) {
        fs.renameSync(src, path.join(defaultDir, f));
      }
    }
  }

  writeJson(INDEX_FILE, {
    profiles: [{ id: defaultId, name: 'Standard', createdAt: new Date().toISOString() }],
  });
  writeJson(CONFIG_FILE, { activeProfileId: defaultId });
}

function listProfiles() {
  migrateLegacyDataIfNeeded();
  return readJson(INDEX_FILE, { profiles: [] }).profiles;
}

function getActiveProfileId() {
  migrateLegacyDataIfNeeded();
  const config = readJson(CONFIG_FILE, {});
  const profiles = listProfiles();
  if (config.activeProfileId && profiles.some((p) => p.id === config.activeProfileId)) {
    return config.activeProfileId;
  }
  return profiles[0] ? profiles[0].id : null;
}

function getActiveProfileDir() {
  return getProfileDir(getActiveProfileId());
}

function getProfileDir(id) {
  const dir = path.join(PROFILES_DIR, id || 'default');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function switchProfile(id) {
  const profiles = listProfiles();
  if (!profiles.some((p) => p.id === id)) throw new Error('Profil nicht gefunden.');
  writeJson(CONFIG_FILE, { activeProfileId: id });
  return getActiveProfileId();
}

function createProfile(name) {
  migrateLegacyDataIfNeeded();
  const index = readJson(INDEX_FILE, { profiles: [] });
  const id = slugId(name);
  index.profiles.push({ id, name: name.trim(), createdAt: new Date().toISOString() });
  writeJson(INDEX_FILE, index);

  const dir = path.join(PROFILES_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  switchProfile(id);
  return { id, name: name.trim() };
}

function renameProfile(id, newName) {
  const index = readJson(INDEX_FILE, { profiles: [] });
  const profile = index.profiles.find((p) => p.id === id);
  if (!profile) throw new Error('Profil nicht gefunden.');
  profile.name = newName.trim();
  writeJson(INDEX_FILE, index);
  return profile;
}

function deleteProfile(id) {
  const index = readJson(INDEX_FILE, { profiles: [] });
  if (index.profiles.length <= 1) throw new Error('Das letzte Profil kann nicht gelöscht werden.');
  index.profiles = index.profiles.filter((p) => p.id !== id);
  writeJson(INDEX_FILE, index);

  const dir = path.join(PROFILES_DIR, id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });

  const config = readJson(CONFIG_FILE, {});
  if (config.activeProfileId === id) {
    writeJson(CONFIG_FILE, { activeProfileId: index.profiles[0].id });
  }
  return index.profiles;
}

module.exports = {
  listProfiles,
  getActiveProfileId,
  getActiveProfileDir,
  getProfileDir,
  switchProfile,
  createProfile,
  renameProfile,
  deleteProfile,
};
