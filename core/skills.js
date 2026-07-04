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
const dailyBriefing = require('../skills/daily-briefing');
const systemCheck = require('../skills/system-check');
const speedtest = require('../skills/speedtest');
const networkScan = require('../skills/network-scan');
const musicVisualizer = require('../skills/music-visualizer');
const takeScreenshot = require('../skills/take-screenshot');
const rockPaperScissors = require('../skills/rock-paper-scissors');
const worldTime = require('../skills/world-time');
const nightProtocol = require('../skills/night-protocol');
const toggleDesktopIcons = require('../skills/toggle-desktop-icons');
const toggleMute = require('../skills/toggle-mute');
const focusMode = require('../skills/focus-mode');
const toggleCameraGuard = require('../skills/toggle-camera-guard');
const playMusic = require('../skills/play-music');
const stealthMode = require('../skills/stealth-mode');
const typePassword = require('../skills/type-password');
const networkSniper = require('../skills/network-sniper');
const researchTopic = require('../skills/research-topic');
const ghostProtocol = require('../skills/ghost-protocol');
const deepDiagnostics = require('../skills/deep-diagnostics');
const cleanupProtocol = require('../skills/cleanup-protocol');
const summarizeClipboard = require('../skills/summarize-clipboard');
const toggleGamingMode = require('../skills/toggle-gaming-mode');
const reportBug = require('../skills/report-bug');

const ALL_SKILLS = [openApp, closeApp, minimizeApp, systemInfo, webSearch, webFetch, files, screenLook, rememberFact, learnSkill, calendarAdd, calendarList, calendarDelete, meetingStart, meetingSummarize, shutdownPc, cancelShutdown, cleanDownloads, searchFile, dailyBriefing, systemCheck, speedtest, networkScan, musicVisualizer, takeScreenshot, rockPaperScissors, worldTime, nightProtocol, toggleDesktopIcons, toggleMute, focusMode, toggleCameraGuard, playMusic, stealthMode, typePassword, networkSniper, researchTopic, ghostProtocol, deepDiagnostics, cleanupProtocol, summarizeClipboard, toggleGamingMode, reportBug];

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
