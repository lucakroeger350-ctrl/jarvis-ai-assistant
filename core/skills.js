const openApp = require('../skills/open-app');
const systemInfo = require('../skills/system-info');
const webSearch = require('../skills/web-search');
const files = require('../skills/files');
const screenLook = require('../skills/screen-look');
const rememberFact = require('../skills/remember-fact');
const learnSkill = require('../skills/learn-skill');
const calendarAdd = require('../skills/calendar-add');
const calendarList = require('../skills/calendar-list');
const calendarDelete = require('../skills/calendar-delete');
const meetingStart = require('../skills/meeting-start');
const meetingSummarize = require('../skills/meeting-summarize');
const webFetch = require('../skills/web-fetch');
const shutdownPc = require('../skills/system-shutdown');
const cancelShutdown = require('../skills/system-cancel-shutdown');
const closeApp = require('../skills/close-app');
const minimizeApp = require('../skills/minimize-app');
const cleanDownloads = require('../skills/clean-downloads');
const searchFile = require('../skills/search-file');

const ALL_SKILLS = [openApp, closeApp, minimizeApp, systemInfo, webSearch, webFetch, files, screenLook, rememberFact, learnSkill, calendarAdd, calendarList, calendarDelete, meetingStart, meetingSummarize, shutdownPc, cancelShutdown, cleanDownloads, searchFile];

function getToolDefinitions() {
  return ALL_SKILLS.map((s) => ({
    name: s.name,
    description: s.description,
    input_schema: s.input_schema,
  }));
}

async function runSkill(name, input, context) {
  const skill = ALL_SKILLS.find((s) => s.name === name);
  if (!skill) return { error: `Unbekannte Fähigkeit: ${name}` };
  try {
    return await skill.run(input, context);
  } catch (err) {
    return { error: `Fehler bei "${name}": ${err.message}` };
  }
}

module.exports = { getToolDefinitions, runSkill, ALL_SKILLS };
