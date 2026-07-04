const path = require('path');
const { BrowserWindow, screen } = require('electron');

// Zentrale Engine für cinematische Vollbild-Projektionen über ALLE Monitore.
// Wird von Boot-/Shutdown-Sequenz, Sperrbildschirm, Blackout, Rotem Alarm und
// der Einsatzzentrale wiederverwendet. Jeder Monitor bekommt eine Rolle:
//   'orb'   -> pulsierende Kugel + optionale Eingabeleiste/Sprechblase
//   'hud'   -> System-HUD-Widgets
//   'black' -> stylisch schwarz (nur feines Grid)
// Die konkrete Optik liegt in src/projection.html; hier geht es nur um
// Fensterverwaltung pro Display.

let projectionWindows = []; // { win, displayId }
let getMainWindow = null;
let dismissHandler = null;

function init(getMainWindowFn) {
  getMainWindow = getMainWindowFn;
}

function isActive() {
  return projectionWindows.length > 0;
}

function primaryDisplay() {
  const mainWindow = getMainWindow ? getMainWindow() : null;
  return mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()) : screen.getPrimaryDisplay();
}

// Legt die Rollenverteilung fest: der Hauptmonitor bekommt die angegebene
// Primärrolle (Standard 'orb'), alle weiteren die Sekundärrolle (Standard 'hud').
function computeRoles(primaryRole, secondaryRole) {
  const displays = screen.getAllDisplays();
  const primary = primaryDisplay();
  return displays.map((d) => ({
    display: d,
    role: d.id === primary.id ? primaryRole : secondaryRole,
  }));
}

// mode: freier String, den projection.html interpretiert (z.B. 'boot', 'shutdown',
// 'lock', 'blackout', 'red-alert', 'warroom'). options.text / options.showInput steuern
// die Kugel-Seite.
function open(mode, primaryRole, secondaryRole, options = {}) {
  closeAll();
  const layout = computeRoles(primaryRole, secondaryRole);

  projectionWindows = layout.map(({ display, role }) => {
    const win = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      fullscreen: true,
      skipTaskbar: true,
      backgroundColor: '#000000',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload-projection.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    const query = {
      role,
      mode,
      isPrimary: display.id === primaryDisplay().id ? '1' : '0',
      text: options.text || '',
      showInput: options.showInput ? '1' : '0',
    };
    win.loadFile(path.join(__dirname, '..', 'src', 'projection.html'), { query });
    win.on('closed', () => {
      projectionWindows = projectionWindows.filter((p) => p.win !== win);
    });
    return { win, displayId: display.id, role };
  });

  // Bug-Fix: Bei mehreren Monitoren bekommt sonst nicht garantiert das Fenster mit der
  // Eingabeleiste (Primärrolle) den Tastatur-Fokus - Tastatureingaben (z.B. die PIN)
  // könnten sonst ins Leere bzw. in ein anderes Projektionsfenster gehen.
  const primaryEntry = projectionWindows.find((p) => p.role === primaryRole) || projectionWindows[0];
  if (primaryEntry) {
    primaryEntry.win.once('ready-to-show', () => primaryEntry.win.focus());
    primaryEntry.win.webContents.once('did-finish-load', () => primaryEntry.win.focus());
  }

  return projectionWindows.length;
}

// Sendet ein Ereignis an alle Projektionsfenster (z.B. Status-/Farbwechsel).
function broadcast(channel, payload) {
  projectionWindows.forEach(({ win }) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  });
}

function closeAll() {
  // Erst verstecken, dann zerstören - lässt DWM die Vollbild-Fensterregion sauber
  // freigeben. destroy() statt close(): erzwingt sofortiges, garantiertes Schließen
  // (auch beim App-Beenden/Absturz), damit nie ein Vollbild-Fenster als schwarzer Rest
  // auf dem Desktop hängen bleibt.
  projectionWindows.forEach(({ win }) => { if (win && !win.isDestroyed()) { win.hide(); win.destroy(); } });
  projectionWindows = [];
}

// Wird von preload-projection.js über IPC ausgelöst, wenn der Nutzer in der
// Boot-Eingabeleiste "Ja/Weiter" bestätigt.
function onDismiss(handler) {
  dismissHandler = handler;
}
function triggerDismiss(value) {
  if (dismissHandler) dismissHandler(value);
}

module.exports = { init, open, broadcast, closeAll, isActive, onDismiss, triggerDismiss };
