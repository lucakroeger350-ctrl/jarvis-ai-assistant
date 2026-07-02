const { app, BrowserWindow, ipcMain, session, globalShortcut, desktopCapturer, shell, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const memory = require('./core/memory');
const brain = require('./core/brain');
const whisperStt = require('./core/whisper-stt');
const { launchApp } = require('./core/launcher');
const { buildGreeting } = require('./core/greeting');
const calendar = require('./core/calendar');
const meeting = require('./core/meeting');
const profiles = require('./core/profiles');
const auth = require('./core/auth');
const { autoUpdater } = require('electron-updater');
const integrations = require('./core/integrations');
const piperTts = require('./core/piper-tts');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#05080d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function applyAutoStartSetting(enabled) {
  try {
    // In der installierten (gepackten) Version braucht die .exe keinen Pfad-Parameter -
    // der wurde bisher fälschlich immer mitgegeben, wodurch der Autostart-Eintrag
    // fehlerhaft war und Windows JARVIS beim Login nicht korrekt gestartet hat.
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath,
      args: enabled && !app.isPackaged ? [path.join(__dirname)] : [],
    });
  } catch (err) {
    console.warn('Autostart konnte nicht gesetzt werden:', err.message);
  }
}

const MACRO_HOTKEY = 'Control+Shift+J';
const PASTE_SCRIPT_PATH = path.join(os.tmpdir(), 'jarvis-paste.ps1');

function ensurePasteScript() {
  if (fs.existsSync(PASTE_SCRIPT_PATH)) return;
  const script = `Add-Type -AssemblyName System.Windows.Forms\nStart-Sleep -Milliseconds 120\n[System.Windows.Forms.SendKeys]::SendWait("^v")\n`;
  fs.writeFileSync(PASTE_SCRIPT_PATH, script, 'utf-8');
}

function triggerMacroPaste() {
  const settings = memory.getSettings();
  if (!settings.macroText) return;
  clipboard.writeText(settings.macroText);
  ensurePasteScript();
  require('child_process').exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${PASTE_SCRIPT_PATH}"`);
}

// Registriert alle globalen Tastenkombinationen gemeinsam neu (Mikrofon + Speed-Typer-Makro),
// da globalShortcut.unregisterAll() sonst auch die jeweils andere Kombination löschen würde.
function applyAllHotkeys(settings) {
  globalShortcut.unregisterAll();

  if (settings.hotkey) {
    try {
      globalShortcut.register(settings.hotkey, () => {
        send('shortcut:mic', {});
        if (mainWindow) mainWindow.focus();
      });
    } catch (err) {
      console.warn('Mikrofon-Tastenkombination konnte nicht registriert werden:', err.message);
    }
  }

  try {
    globalShortcut.register(MACRO_HOTKEY, triggerMacroPaste);
  } catch (err) {
    console.warn('Speed-Typer-Tastenkombination konnte nicht registriert werden:', err.message);
  }
}

function startReminderTimer() {
  setInterval(() => {
    const due = calendar.dueReminders();
    for (const appt of due) {
      const apptTime = new Date(appt.datetime);
      const minutesUntil = Math.round((apptTime.getTime() - Date.now()) / 60000);
      let text;
      if (appt.bufferMinutes) {
        text = `Erinnerung, Sir: Termin "${appt.title}" um ${apptTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}. Sie sollten in etwa ${Math.max(minutesUntil - appt.bufferMinutes, 0)} Minuten losgehen, um pünktlich zu sein.`;
      } else {
        text = `Erinnerung, Sir: In ${minutesUntil} Minuten haben Sie den Termin "${appt.title}".`;
      }
      send('app:announce', { text });
    }
  }, 60 * 1000);
}

function startEyeCareTimer() {
  setInterval(() => {
    send('app:announce', { text: 'Sir, Sie sitzen nun seit zwei Stunden am Platz. Ich empfehle, kurz die Augen zu entspannen und etwas zu trinken.' });
  }, 2 * 60 * 60 * 1000);
}

async function runStartupRoutine() {
  const settings = memory.getSettings();
  applyAutoStartSetting(!!settings.autoStart);

  send('app:greeting', { text: buildGreeting(settings.userName) });

  if (settings.autoStart && settings.autoLaunchApps) {
    const apps = settings.autoLaunchApps.split(',').map((a) => a.trim()).filter(Boolean);
    for (const appName of apps) {
      await launchApp(appName);
    }
  }
}

// Auto-Update: prüft nur passiv gegen die veröffentlichten GitHub-Releases und
// informiert den Nutzer. Heruntergeladen/installiert wird ausschließlich nach
// expliziter Bestätigung durch den Nutzer - nie automatisch im Hintergrund.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

autoUpdater.on('update-available', (info) => {
  send('update:available', { version: info.version });
});
autoUpdater.on('update-not-available', () => {
  send('update:status', { status: 'up-to-date' });
});
autoUpdater.on('error', (err) => {
  send('update:status', { status: 'error', message: err.message });
});
autoUpdater.on('download-progress', (progress) => {
  send('update:progress', { percent: Math.round(progress.percent) });
});
autoUpdater.on('update-downloaded', () => {
  send('update:ready', {});
});

function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((err) => {
    send('update:status', { status: 'error', message: err.message });
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  // Erlaubt der Renderer-Seite, das Systemaudio (Loopback) ohne Auswahldialog
  // für die Meeting-Aufnahme mitzuschneiden.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      callback({ video: sources[0], audio: 'loopback' });
    });
  }, { useSystemPicker: false });

  createWindow();
  meeting.init(send);

  const settings = memory.getSettings();
  applyAllHotkeys(settings);
  startReminderTimer();
  startEyeCareTimer();

  if (app.isPackaged) {
    setTimeout(checkForUpdates, 5000); // stiller Check kurz nach dem Start
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('jarvis:chat', async (_event, message) => {
  return brain.chat(message);
});

ipcMain.handle('settings:get', () => memory.getSettings());
ipcMain.handle('settings:save', (_event, settings) => {
  const saved = memory.saveSettings(settings);
  applyAutoStartSetting(!!saved.autoStart);
  applyAllHotkeys(saved);
  return saved;
});

ipcMain.handle('auth:register', (_event, { email, password, displayName }) => auth.register(email, password, displayName));
ipcMain.handle('auth:login', (_event, { email, password }) => auth.login(email, password));
ipcMain.handle('auth:logout', () => auth.logout());
ipcMain.handle('auth:get-session', () => auth.getSession());
ipcMain.handle('app:session-ready', () => { runStartupRoutine(); return true; });

ipcMain.handle('update:check', () => {
  if (!app.isPackaged) return { error: 'Update-Check funktioniert nur in der installierten Version, nicht im Entwicklungsmodus.' };
  checkForUpdates();
  return { checking: true };
});
ipcMain.handle('update:download', () => { autoUpdater.downloadUpdate(); return true; });
ipcMain.handle('update:install', () => { autoUpdater.quitAndInstall(); return true; });
ipcMain.handle('app:get-version', () => app.getVersion());

ipcMain.handle('tts:piper-installed', () => piperTts.isInstalled());
ipcMain.handle('tts:ensure-piper', async () => {
  try {
    await piperTts.ensurePiperInstalled((msg) => send('tts:piper-progress', { message: msg }));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('tts:speak-piper', async (_event, text) => {
  try {
    const wavPath = await piperTts.synthesize(text);
    const base64 = fs.readFileSync(wavPath).toString('base64');
    fs.unlink(wavPath, () => {});
    return { audio: base64 };
  } catch (err) {
    return { error: err.message };
  }
});
ipcMain.handle('system:open-sound-settings', () => shell.openExternal('ms-settings:sound'));
ipcMain.handle('system:open-voice-settings', () => shell.openExternal('ms-settings:speech'));

ipcMain.handle('integrations:get', () => integrations.get());
ipcMain.handle('integrations:save', (_event, config) => integrations.save(config));

ipcMain.handle('profiles:list', () => profiles.listProfiles());
ipcMain.handle('profiles:get-active', () => profiles.getActiveProfileId());
ipcMain.handle('profiles:create', (_event, name) => profiles.createProfile(name));
ipcMain.handle('profiles:switch', (_event, id) => {
  profiles.switchProfile(id);
  const settings = memory.getSettings();
  applyAllHotkeys(settings);
  applyAutoStartSetting(!!settings.autoStart);
  return settings;
});
ipcMain.handle('profiles:rename', (_event, { id, name }) => profiles.renameProfile(id, name));
ipcMain.handle('profiles:delete', (_event, id) => profiles.deleteProfile(id));

ipcMain.handle('calendar:add', (_event, appt) => calendar.addAppointment(appt));
ipcMain.handle('calendar:list', () => calendar.listAppointments());
ipcMain.handle('calendar:delete', (_event, id) => calendar.deleteAppointment(id));

// Renderer schickt die aufgezeichnete Meeting-Audiodatei (bereits als WAV kodiert, Base64) hierher.
ipcMain.handle('meeting:submit-audio', (_event, base64Wav) => {
  const filePath = path.join(os.tmpdir(), `jarvis-meeting-${Date.now()}.wav`);
  fs.writeFileSync(filePath, Buffer.from(base64Wav, 'base64'));
  meeting.receiveAudioFile(filePath);
  return true;
});

ipcMain.handle('memory:get', () => memory.getMemory());
ipcMain.handle('memory:clear', () => memory.clearMemory());
ipcMain.handle('memory:delete', (_event, id) => memory.deleteMemoryFact(id));

ipcMain.handle('skills:get-learned', () => memory.getLearnedSkills());
ipcMain.handle('skills:delete-learned', (_event, id) => memory.deleteLearnedSkill(id));

// Push-to-Talk: Der Renderer nimmt das Mikrofon selbst auf (bis Stille erkannt wird)
// und schickt die rohen 16kHz-Audiosamples hierher zur Whisper-Transkription.
ipcMain.handle('speech:transcribe', async (_event, float32Samples) => {
  try {
    const settings = memory.getSettings();
    const language = (settings.language || 'de-DE').startsWith('en') ? 'english' : 'german';
    const text = await whisperStt.transcribeSamples(Float32Array.from(float32Samples), language);
    return { text };
  } catch (err) {
    return { error: err.message };
  }
});
