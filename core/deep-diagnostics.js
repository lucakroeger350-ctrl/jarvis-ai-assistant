const path = require('path');
const { BrowserWindow, screen } = require('electron');
const { checkSystem } = require('./hardware-monitor');

let getMainWindow = null;

function init(getMainWindowFn) {
  getMainWindow = getMainWindowFn;
}

// Tiefendiagnose: rein theatralischer FBI-Scan-Effekt über ~3.5s, gefolgt von einem
// ECHTEN Hardware-Status am Ende (keine erfundenen Optimierungswerte).
function runDeepDiagnostics() {
  return new Promise((resolve) => {
    const mainWindow = getMainWindow ? getMainWindow() : null;
    if (mainWindow) mainWindow.minimize();

    const display = screen.getPrimaryDisplay();
    const diagWindow = new BrowserWindow({
      x: display.bounds.x,
      y: display.bounds.y,
      width: display.bounds.width,
      height: display.bounds.height,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false },
    });
    diagWindow.loadFile(path.join(__dirname, '..', 'src', 'diagnostics-overlay.html'));

    setTimeout(async () => {
      if (!diagWindow.isDestroyed()) diagWindow.close();
      if (mainWindow) { mainWindow.restore(); mainWindow.focus(); }
      try {
        resolve(await checkSystem());
      } catch {
        resolve(null);
      }
    }, 3600);
  });
}

module.exports = { init, runDeepDiagnostics };
