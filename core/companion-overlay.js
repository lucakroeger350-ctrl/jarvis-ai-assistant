const path = require('path');
const { BrowserWindow, screen } = require('electron');

let companionWindow = null;
let getMainWindow = null;

function init(getMainWindowFn) {
  getMainWindow = getMainWindowFn;
  screen.on('display-added', ensureWindow);
  screen.on('display-removed', ensureWindow);
  ensureWindow();
}

function pickSecondaryDisplay() {
  const displays = screen.getAllDisplays();
  if (displays.length < 2) return null;
  const mainWindow = getMainWindow ? getMainWindow() : null;
  const primaryDisplay = mainWindow ? screen.getDisplayMatching(mainWindow.getBounds()) : screen.getPrimaryDisplay();
  return displays.find((d) => d.id !== primaryDisplay.id) || null;
}

// Baut das Begleit-Fenster auf dem zweiten Monitor neu auf, wenn sich die Monitor-Konfiguration
// ändert (Monitor an-/abgesteckt) - läuft mehrmals gefahrlos, da vorher immer aufgeräumt wird.
function ensureWindow() {
  const secondary = pickSecondaryDisplay();

  if (!secondary) {
    if (companionWindow && !companionWindow.isDestroyed()) companionWindow.close();
    companionWindow = null;
    return;
  }

  if (companionWindow && !companionWindow.isDestroyed()) return;

  companionWindow = new BrowserWindow({
    x: secondary.bounds.x,
    y: secondary.bounds.y,
    width: secondary.bounds.width,
    height: secondary.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload-companion.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  companionWindow.setAlwaysOnTop(true, 'screen-saver');
  companionWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  companionWindow.setIgnoreMouseEvents(true, { forward: true });
  companionWindow.loadFile(path.join(__dirname, '..', 'src', 'companion-overlay.html'));
  companionWindow.on('closed', () => { companionWindow = null; });
}

function setState(state) {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.webContents.send('companion:state', { state });
  }
}

module.exports = { init, setState };
