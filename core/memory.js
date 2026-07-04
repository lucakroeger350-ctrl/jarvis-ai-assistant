const fs = require('fs');
const path = require('path');
const profiles = require('./profiles');

function memoryFile() { return path.join(profiles.getActiveProfileDir(), 'memory.json'); }
function settingsFile() { return path.join(profiles.getActiveProfileDir(), 'settings.json'); }
function learnedSkillsFile() { return path.join(profiles.getActiveProfileDir(), 'learned-skills.json'); }

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

const DEFAULT_SETTINGS = {
  model: 'gemini-2.5-flash',
  personality: 'Du bist JARVIS, ein hochintelligenter, loyaler und leicht trockener KI-Assistent im Stil von Tony Starks JARVIS. Du sprichst Deutsch, bist präzise, hilfsbereit und hast einen subtilen Sinn für Humor. Du sprichst den Nutzer IMMER förmlich mit "Sie" und "Sir" an, niemals mit "du". Formuliere professionell und knapp wie ein erstklassiger persönlicher Assistent, z.B. "Alles klar, ich öffne für Sie Opera.", "Gewiss, Sir. Erledigt.", "Einen Moment, ich habe das für Sie herausgefunden." Vermeide unbeholfene Formulierungen, Füllwörter oder falsche Anredepronomen.',
  wakeWord: 'jarvis',
  language: 'de-DE',
  voiceEngine: 'browser',
  voiceName: 'Microsoft Stefan',
  voiceRate: 0.95,
  voicePitch: 0.9,
  userName: '',
  hotkey: 'Alt+J',
  macroText: '',
  autoStart: false,
  autoLaunchApps: 'spotify, discord',
  accentTheme: 'orange',
  bootProjection: false,
  redAlertEnabled: true,
  shareLearningsWithCloud: false,
  adhsMode: false,
  permissions: {
    screen: true,
    apps: true,
    files: true,
  },
};

function getSettings() {
  const saved = readJson(settingsFile(), {});
  return { ...DEFAULT_SETTINGS, ...saved, permissions: { ...DEFAULT_SETTINGS.permissions, ...(saved.permissions || {}) } };
}

function saveSettings(settings) {
  const current = getSettings();
  const merged = { ...current, ...settings, permissions: { ...current.permissions, ...(settings.permissions || {}) } };
  writeJson(settingsFile(), merged);
  return merged;
}

function getMemory() {
  return readJson(memoryFile(), { facts: [] });
}

function addMemoryFact(text) {
  const mem = getMemory();
  mem.facts.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, createdAt: new Date().toISOString() });
  writeJson(memoryFile(), mem);
  return mem;
}

function deleteMemoryFact(id) {
  const mem = getMemory();
  mem.facts = mem.facts.filter((f) => f.id !== id);
  writeJson(memoryFile(), mem);
  return mem;
}

function clearMemory() {
  const empty = { facts: [] };
  writeJson(memoryFile(), empty);
  return empty;
}

function getMemoryContextString() {
  const mem = getMemory();
  if (!mem.facts.length) return '';
  return 'Dinge, die du dir über den Nutzer und aus früheren Gesprächen gemerkt hast:\n' +
    mem.facts.map((f) => `- ${f.text}`).join('\n');
}

function getLearnedSkills() {
  return readJson(learnedSkillsFile(), { skills: [] });
}

function addLearnedSkill(skill) {
  const data = getLearnedSkills();
  data.skills.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...skill, createdAt: new Date().toISOString() });
  writeJson(learnedSkillsFile(), data);
  return data;
}

function deleteLearnedSkill(id) {
  const data = getLearnedSkills();
  data.skills = data.skills.filter((s) => s.id !== id);
  writeJson(learnedSkillsFile(), data);
  return data;
}

// Überschreibt die jeweilige Profildatei komplett - genutzt beim Wiederherstellen
// einer Cloud-Momentaufnahme (z.B. nach Neuinstallation), nicht im normalen Betrieb.
function restoreSettings(settings) { writeJson(settingsFile(), settings); }
function restoreMemory(mem) { writeJson(memoryFile(), mem); }
function restoreLearnedSkills(data) { writeJson(learnedSkillsFile(), data); }

module.exports = {
  getSettings,
  saveSettings,
  getMemory,
  addMemoryFact,
  deleteMemoryFact,
  clearMemory,
  getMemoryContextString,
  getLearnedSkills,
  addLearnedSkill,
  deleteLearnedSkill,
  restoreSettings,
  restoreMemory,
  restoreLearnedSkills,
};
