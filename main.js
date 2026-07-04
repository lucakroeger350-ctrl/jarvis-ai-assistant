const { app, BrowserWindow, ipcMain, session, globalShortcut, desktopCapturer, shell, clipboard, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const memory = require('./core/memory');
const autostart = require('./core/autostart');
const desktopRefresh = require('./core/desktop-refresh');
const brain = require('./core/brain');
const whisperStt = require('./core/whisper-stt');
const { launchApp } = require('./core/launcher');
const { buildGreeting } = require('./core/greeting');
const calendar = require('./core/calendar');
const meeting = require('./core/meeting');
const profiles = require('./core/profiles');
const auth = require('./core/auth');
const cloudSync = require('./core/cloud-sync');
const creditGate = require('./core/credit-gate');
const dlcManager = require('./core/dlc-manager');
const aiClient = require('./core/ai-client');
const { autoUpdater } = require('electron-updater');
const integrations = require('./core/integrations');
const piperTts = require('./core/piper-tts');
const { checkSystem } = require('./core/hardware-monitor');
const visualizerBridge = require('./core/visualizer-bridge');
const networkScan = require('./core/network-scan');
const account = require('./core/account');
const gamingMode = require('./core/gaming-mode');
const sharedLearnings = require('./core/shared-learnings');
const gamingBridge = require('./core/gaming-bridge');
const securityGuard = require('./core/security-guard');
const faceModels = require('./core/face-models');
const { activateStealthMode } = require('./core/stealth-mode');
const spotifyAuth = require('./core/spotify-auth');
const passwordVault = require('./core/password-vault');
const autoType = require('./core/auto-type');
const vaultBridge = require('./core/vault-bridge');
const deepDiagnostics = require('./core/deep-diagnostics');
const companionOverlay = require('./core/companion-overlay');
const screenManager = require('./core/screen-manager');

let mainWindow;
let gamingOverlayWindow = null;
let lockdownWindows = [];
const LOCKDOWN_OVERRIDE_KEYS = ['Alt+F4', 'Escape', 'Alt+Tab', 'Super'];

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
    if (app.isPackaged) {
      // Alten Registry-Run-Key aus früheren JARVIS-Versionen entfernen (Migration),
      // damit niemand doppelt startet (einmal per Run-Key, einmal per Scheduled Task).
      app.setLoginItemSettings({ openAtLogin: false, path: process.execPath });
      // Scheduled Task statt Registry-Run-Key: startet ohne Windows' eingebaute
      // Login-Verzögerung (siehe core/autostart.js).
      if (enabled) autostart.enable(process.execPath);
      else autostart.disable();
    } else {
      // Im Entwicklungsmodus (npm start) bleibt der einfache Weg, da hier kein
      // sinnvoller alleinstehender Programmpfad für einen Scheduled Task existiert.
      app.setLoginItemSettings({
        openAtLogin: enabled,
        path: process.execPath,
        args: enabled ? [path.join(__dirname)] : [],
      });
    }
  } catch (err) {
    console.warn('Autostart konnte nicht gesetzt werden:', err.message);
  }
}

const MACRO_HOTKEY = 'Control+Shift+J';
const STEALTH_HOTKEY = 'Control+Shift+T';
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

  try {
    globalShortcut.register(STEALTH_HOTKEY, () => {
      if (account.getAccountState().tier === account.TIERS.VIP) activateStealthMode();
    });
  } catch (err) {
    console.warn('Boss-Key-Tastenkombination konnte nicht registriert werden:', err.message);
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

// Kurze, häufigere Check-ins statt des seltenen Augen-Timers - nur wenn ADHS-Modus
// in den Einstellungen aktiviert ist (prüft bei jedem Tick neu, reagiert also sofort
// auf ein Ein-/Ausschalten ohne Neustart).
function startAdhsCheckInTimer() {
  setInterval(() => {
    const settings = memory.getSettings();
    if (!settings.adhsMode) return;
    send('app:announce', { text: 'Kurzer Check-in, Sir: Noch im Fokus? Sagen Sie mir, woran Sie gerade arbeiten.' });
  }, 20 * 60 * 1000);
}

function startHardwareWatchdog() {
  let alreadyWarned = false;
  setInterval(async () => {
    try {
      const status = await checkSystem();
      if (status.critical && !alreadyWarned) {
        alreadyWarned = true;
        send('app:announce', { text: `Warnung, Sir: Die Systemauslastung ist kritisch. CPU bei ${status.cpuLoad} Prozent, Arbeitsspeicher bei ${status.ramPercent} Prozent.` });
        send('app:hardware-alert', { cpuLoad: status.cpuLoad, ramPercent: status.ramPercent });
      } else if (!status.critical) {
        alreadyWarned = false;
      }
    } catch {
      // stille Fehlbehandlung - Hardware-Monitoring ist nicht kritisch
    }
  }, 60 * 1000);
}

// Ersetzt Electrons/Windows' hässliche Standard-Fehleranzeige durch ein JARVIS-Popup.
// WICHTIG (Scope-Klarstellung): Das fängt nur Fehler INNERHALB von JARVIS selbst ab
// (Haupt- und Renderer-Prozess). Beliebige Windows-Fehlerdialoge fremder Programme
// abzufangen würde eine Registrierung als System-Debugger (Windows Error Reporting)
// mit Admin-Rechten erfordern - das ist bewusst nicht Teil dieser Funktion.
function showSystemErrorPopup(message) {
  if (account.getAccountState().tier !== account.TIERS.VIP) {
    console.error(message);
    return;
  }
  const popup = new BrowserWindow({
    width: 480,
    height: 320,
    alwaysOnTop: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  popup.setMenuBarVisibility(false);
  popup.loadFile(path.join(__dirname, 'src', 'error-popup.html'), { query: { message: String(message).slice(0, 2000) } });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  showSystemErrorPopup(err.message || String(err));
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  showSystemErrorPopup(reason && reason.message ? reason.message : String(reason));
});

// Passwort-Tresor: eigenständiges Popup-Fenster für die PIN-Eingabe, damit die PIN
// NIEMALS über den Chat/die Sprachpipeline läuft (und somit nie an die KI-API geht).
let vaultPinWindow = null;
let pendingVaultEntry = null;

function openVaultPinPopup(entry) {
  pendingVaultEntry = entry;
  vaultPinWindow = new BrowserWindow({
    width: 320,
    height: 230,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-vault-pin.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  vaultPinWindow.setMenuBarVisibility(false);
  vaultPinWindow.loadFile(path.join(__dirname, 'src', 'vault-pin.html'));
  vaultPinWindow.on('closed', () => { vaultPinWindow = null; pendingVaultEntry = null; });
}

deepDiagnostics.init(() => mainWindow);

function enterGamingOverlay() {
  gamingMode.closeBackgroundApps();
  gamingMode.setOverlayActive(true);
  if (mainWindow) mainWindow.hide();

  // Bug-Fix: Kugel erschien immer auf dem PRIMÄREN Monitor - bei Mehrmonitor-Setups
  // war das oft nicht der Monitor, auf dem gerade gespielt wird. Jetzt der Monitor,
  // auf dem sich gerade der Mauszeiger befindet (meist der aktive Spiel-Monitor).
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  gamingOverlayWindow = new BrowserWindow({
    width: 110,
    height: 110,
    x: display.workArea.x + display.workArea.width - 130,
    y: display.workArea.y + 20,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-gaming-overlay.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  // "screen-saver"-Level statt einfachem alwaysOnTop, damit die Kugel auch über
  // exklusiven Vollbild-Spielen sichtbar bleibt.
  gamingOverlayWindow.setAlwaysOnTop(true, 'screen-saver');
  gamingOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Standardmäßig klickdurchlässig - nur wenn die Maus über der Kugel selbst ist,
  // wird das Fenster (per IPC von gaming-overlay.html) wieder klickbar.
  gamingOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
  gamingOverlayWindow.loadFile(path.join(__dirname, 'src', 'gaming-overlay.html'));
  gamingOverlayWindow.on('closed', () => { gamingOverlayWindow = null; });
}

function exitGamingOverlay() {
  gamingMode.setOverlayActive(false);
  // Erst verstecken, dann schließen - lässt Windows/DWM die transparente Fensterregion
  // sauber freigeben, statt sie beim direkten Schließen als Bildreste stehen zu lassen.
  if (gamingOverlayWindow) {
    gamingOverlayWindow.hide();
    gamingOverlayWindow.close();
    gamingOverlayWindow = null;
  }
  if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
}

// Sperrt alle Bildschirme mit einem Vollbild-Warnfenster, bis die richtige PIN
// eingegeben wird. Wichtig: echte Betriebssystem-Kombinationen wie Strg+Alt+Entf
// kann KEINE Anwendung blockieren (Windows-Sicherheitsdesign) - hier werden nur
// die häufigsten App-internen Ausweich-Wege (Alt+F4, Esc, Alt+Tab) überschrieben.
function triggerLockdown() {
  if (lockdownWindows.length) return; // bereits gesperrt
  send('app:announce', { text: 'Achtung, Sir: Ein unbekanntes Gesicht wurde erkannt. Ich sperre alle Bildschirme.' });

  LOCKDOWN_OVERRIDE_KEYS.forEach((key) => {
    try { globalShortcut.register(key, () => {}); } catch { /* ignore */ }
  });

  const displays = screen.getAllDisplays();
  const primaryDisplay = mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()) : screen.getPrimaryDisplay();
  lockdownWindows = displays.map((display) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      fullscreen: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload-lockdown.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.loadFile(path.join(__dirname, 'src', 'lockdown.html'));
    // Bug-Fix: garantiert, dass das PIN-Eingabefeld auf dem Hauptmonitor den
    // Tastatur-Fokus bekommt (bei mehreren Fenstern sonst nicht sichergestellt).
    if (display.id === primaryDisplay.id) {
      win.webContents.once('did-finish-load', () => win.focus());
    }
    return win;
  });
}

function endLockdown() {
  LOCKDOWN_OVERRIDE_KEYS.forEach((key) => {
    try { globalShortcut.unregister(key); } catch { /* ignore */ }
  });
  // Erst verstecken, dann zerstören - lässt Windows/DWM die Vollbild-Fensterregion
  // sauber freigeben, statt sie als schwarzen Rest auf dem Desktop stehen zu lassen
  // (Bug: Icons markieren blieb sonst minutenlang schwarz).
  lockdownWindows.forEach((w) => { if (!w.isDestroyed()) { w.hide(); w.destroy(); } });
  lockdownWindows = [];
  applyAllHotkeys(memory.getSettings());
  desktopRefresh.refreshDesktop();
}

function startGamingWatchdog() {
  gamingMode.startWatcher((gameName) => {
    send('app:announce', { text: `Sir, ich habe ${gameName} erkannt. Möchten Sie, dass ich mich minimiere?` });
  });
}

// Sichert das aktive Profil regelmäßig in die Cloud (Supabase), damit Einstellungen,
// gemerkte Fakten, gelernte Skills und VIP-/Coin-Stand auch nach einer Neuinstallation
// wiederhergestellt werden können. Läuft nur, solange eine Cloud-Sitzung besteht.
function startCloudSyncTimer() {
  setInterval(async () => {
    const session = await auth.getFullSession().catch(() => null);
    if (!session) return;
    cloudSync.pushProfile(session.accessToken, session.userId, session.email, session.displayName).catch(() => {});
  }, 90 * 1000);
}

function startNetworkWatchdog() {
  networkScan.startWatchdog((newDevices) => {
    const list = newDevices.map((d) => d.ip).join(', ');
    send('app:announce', { text: `Warnung, Sir: Ich habe ${newDevices.length === 1 ? 'ein neues Gerät' : `${newDevices.length} neue Geräte`} in Ihrem WLAN entdeckt (${list}).` });
  });
}

const BOOT_PROJECTION_TEXT = 'Guten Tag Sir! Die Systeme wurden alle gestartet und sind einsatzbereit, sobald Sie es sagen!';

// Cinematische Boot-Projektion über alle Monitore. Der Hauptmonitor zeigt die Kugel
// mit Ansage + Eingabeleiste, weitere Monitore das HUD. Die Ansage wird zusätzlich
// über die normale Sprachpipeline des Hauptfensters gesprochen (Audio läuft auch,
// während die Projektion darüber liegt).
function startBootProjection() {
  screenManager.open('boot', 'orb', 'hud', { text: BOOT_PROJECTION_TEXT, showInput: true });
  send('app:announce', { text: BOOT_PROJECTION_TEXT });
}

function endBootProjection() {
  // HUD zieht sich zurück -> Projektion schließen, Desktop + Hauptfenster wieder frei.
  screenManager.closeAll();
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); }
  desktopRefresh.refreshDesktop();
}

// Unterscheidet einen echten Windows-Neustart/-Login (PC gerade erst hochgefahren) von
// einem simplen Wiederöffnen von JARVIS auf einem PC, der schon länger läuft - die
// cinematische Boot-Projektion soll nur beim wirklichen Hochfahren laufen, sonst reicht
// eine normale, kurze Begrüßung.
const FRESH_BOOT_UPTIME_THRESHOLD_SEC = 180;
function isFreshBoot() {
  return os.uptime() < FRESH_BOOT_UPTIME_THRESHOLD_SEC;
}

async function runStartupRoutine() {
  const settings = memory.getSettings();
  applyAutoStartSetting(!!settings.autoStart);

  if (settings.bootProjection && isFreshBoot()) {
    startBootProjection();
  } else {
    send('app:greeting', { text: buildGreeting(settings.userName) });
  }

  if (settings.shareLearningsWithCloud) {
    sharedLearnings.syncSharedLearnings().catch(() => {});
  }

  const guardStatus = securityGuard.getStatus();
  if (guardStatus.enabled && guardStatus.hasFace && guardStatus.hasPin) {
    securityGuard.setArmed(true);
    send('security:armed-changed', { armed: true });
  }

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
  visualizerBridge.init(send);
  vaultBridge.init(openVaultPinPopup);
  creditGate.init(send);
  dlcManager.init(send);
  gamingBridge.init(enterGamingOverlay, exitGamingOverlay);
  companionOverlay.init(() => mainWindow);
  screenManager.init(() => mainWindow);
  screenManager.onDismiss(() => endBootProjection());

  const settings = memory.getSettings();
  applyAllHotkeys(settings);
  startReminderTimer();
  startEyeCareTimer();
  startAdhsCheckInTimer();
  startHardwareWatchdog();
  startNetworkWatchdog();
  startGamingWatchdog();
  startCloudSyncTimer();

  if (app.isPackaged) {
    setTimeout(checkForUpdates, 5000); // stiller Check kurz nach dem Start
    // Zusätzlich regelmäßig im Hintergrund prüfen, damit neu veröffentlichte Updates
    // auch erkannt werden, wenn JARVIS schon länger läuft (nicht nur beim Start).
    setInterval(checkForUpdates, 4 * 60 * 60 * 1000); // alle 4 Stunden
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Bug-Fix: garantiert, dass beim Beenden/Deinstallieren/Absturz KEIN Vollbild- oder
// Overlay-Fenster (Sperrbildschirm, Projektion, Gaming-/Companion-Kugel) hängen bleibt -
// sonst könnte der Bildschirm dauerhaft schwarz/verdeckt bleiben.
function closeAllOverlayWindows() {
  try { screenManager.closeAll(); } catch { /* ignore */ }
  try {
    lockdownWindows.forEach((w) => { if (w && !w.isDestroyed()) w.destroy(); });
    lockdownWindows = [];
  } catch { /* ignore */ }
  try { if (gamingOverlayWindow && !gamingOverlayWindow.isDestroyed()) gamingOverlayWindow.destroy(); } catch { /* ignore */ }
  try { if (vaultPinWindow && !vaultPinWindow.isDestroyed()) vaultPinWindow.destroy(); } catch { /* ignore */ }
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeAllOverlayWindows();
});

// Zusätzliches Sicherheitsnetz: fängt Fälle ab, in denen "will-quit" durch einen
// Absturz/hartes Beenden nicht mehr erreicht wird.
process.on('exit', closeAllOverlayWindows);

ipcMain.on('app:error', (_event, message) => showSystemErrorPopup(message));
ipcMain.on('app:status-changed', (_event, state) => companionOverlay.setState(state));

// Boot-/Shutdown-Projektion: Nutzer bestätigt in der Kugel-Eingabeleiste.
ipcMain.handle('projection:dismiss', (_event, value) => {
  screenManager.triggerDismiss(value);
  return true;
});

ipcMain.handle('jarvis:chat', async (_event, message) => {
  const gamingResponse = gamingMode.respondToPrompt(message);
  if (gamingResponse.consumed) {
    if (gamingResponse.action === 'enter') {
      const text = `Verstanden, Sir. Ich minimiere mich, während Sie ${gamingResponse.gameName} spielen.`;
      enterGamingOverlay();
      return { text };
    }
    return { text: 'Verstanden, Sir. Ich bleibe im normalen Modus.' };
  }
  return brain.chat(message);
});

ipcMain.handle('gaming:restore', () => { exitGamingOverlay(); return true; });
ipcMain.handle('gaming:set-ignore-mouse', (_event, ignore) => {
  if (gamingOverlayWindow) gamingOverlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
  return true;
});

// ---- Matrix-Kamera-Schutz ----
ipcMain.handle('security:get-status', () => securityGuard.getStatus());
ipcMain.handle('security:set-pin', (_event, pin) => {
  try { securityGuard.setPin(pin); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('security:save-descriptor', (_event, descriptor) => { securityGuard.saveDescriptor(descriptor); return true; });
ipcMain.handle('security:ensure-models', async () => {
  try {
    const dir = await faceModels.ensureModelsDownloaded((msg) => send('security:models-progress', { message: msg }));
    return { ok: true, dir };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('security:set-armed', (_event, armedValue) => {
  securityGuard.setArmed(armedValue);
  securityGuard.setEnabled(armedValue);
  send('security:armed-changed', { armed: armedValue });
  return true;
});
ipcMain.handle('security:check-face', (_event, descriptor) => {
  const match = securityGuard.checkDescriptor(descriptor);
  if (!match) triggerLockdown();
  return { match };
});
ipcMain.handle('security:verify-pin', (_event, pin) => {
  const ok = securityGuard.verifyPin(pin);
  if (ok) endLockdown();
  return { ok };
});

ipcMain.handle('settings:get', () => memory.getSettings());
ipcMain.handle('settings:save', (_event, settings) => {
  const saved = memory.saveSettings(settings);
  applyAutoStartSetting(!!saved.autoStart);
  applyAllHotkeys(saved);
  return saved;
});

ipcMain.handle('auth:register', async (_event, { email, password, displayName }) => {
  account.endGuestSession();
  const result = await auth.register(email, password, displayName);
  const session = await auth.getFullSession().catch(() => null);
  if (session) creditGate.startWatching(session);
  return result;
});
ipcMain.handle('auth:login', async (_event, { email, password }) => {
  account.endGuestSession();
  const result = await auth.login(email, password);
  const session = await auth.getFullSession().catch(() => null);
  if (session) creditGate.startWatching(session);
  return result;
});
ipcMain.handle('auth:logout', async () => {
  const session = await auth.getFullSession().catch(() => null);
  if (session) await cloudSync.pushProfile(session.accessToken, session.userId, session.email, session.displayName).catch(() => {});
  creditGate.stopWatching();
  return auth.logout();
});
ipcMain.handle('auth:get-session', () => auth.getSession());
ipcMain.handle('auth:continue-as-guest', () => { account.startGuestSession(); return true; });
ipcMain.handle('app:session-ready', async () => {
  runStartupRoutine();
  const session = await auth.getFullSession().catch(() => null);
  if (session) creditGate.startWatching(session);
  return true;
});
ipcMain.handle('credits:open-marketplace', () => shell.openExternal(`${aiClient.WEBSITE_URL}/marketplace`));

// Generischer DLC-Teaser: Free-User klickt auf eine gesperrte Premium-Option -> kein
// Fehler, stattdessen Hinweis im HUD + Weiterleitung zur Kauf-Seite im Standard-Browser.
ipcMain.handle('dlc:teaser', (_event, dlcColumn) => {
  if (dlcManager.hasDlc(dlcColumn)) return { owned: true };
  shell.openExternal(`${aiClient.WEBSITE_URL}/marketplace`);
  return { owned: false };
});

ipcMain.handle('account:get-state', () => account.getAccountState());
ipcMain.handle('account:activate-vip', (_event, code) => account.activateVip(code));

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

// ---- Passwort-Tresor ----
ipcMain.handle('vault:has-pin', () => passwordVault.hasPin());
ipcMain.handle('vault:set-pin', (_event, pin) => {
  try { passwordVault.setPin(pin); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('vault:list', () => passwordVault.listEntries());
ipcMain.handle('vault:add-entry', (_event, { pin, label, username, password }) => {
  try { return { ok: true, entry: passwordVault.addEntry(pin, label, username, password) }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('vault:delete-entry', (_event, { pin, id }) => {
  try { passwordVault.deleteEntry(pin, id); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle('vault:open-pin-popup', (_event, label) => {
  const entry = passwordVault.findByLabel(label);
  openVaultPinPopup(entry || { label, notFound: true });
  return true;
});
ipcMain.handle('vault:get-pending-label', () => (pendingVaultEntry ? pendingVaultEntry.label : null));
ipcMain.handle('vault:submit-pin', (_event, pin) => {
  if (!pendingVaultEntry || pendingVaultEntry.notFound) {
    if (vaultPinWindow) vaultPinWindow.close();
    return { ok: false, error: 'Kein passender Eintrag gefunden.' };
  }
  try {
    const password = passwordVault.decryptPassword(pin, pendingVaultEntry.id);
    const entryLabel = pendingVaultEntry.label;
    if (vaultPinWindow) vaultPinWindow.close();
    setTimeout(() => autoType.typeText(password), 300);
    send('app:announce', { text: `Passwort für "${entryLabel}" eingetippt, Sir.` });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});
ipcMain.handle('vault:cancel-pin', () => { if (vaultPinWindow) vaultPinWindow.close(); return true; });

ipcMain.handle('spotify:is-connected', () => spotifyAuth.isConnected());
ipcMain.handle('spotify:connect', async () => {
  try { await spotifyAuth.authorize(); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

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
