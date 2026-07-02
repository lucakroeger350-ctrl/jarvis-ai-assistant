const { exec } = require('child_process');
const { shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Manche Apps (Discord, Spotify, ...) sind unter Windows nicht als PATH-Befehl aufrufbar,
// da sie pro Nutzer in %LOCALAPPDATA%/%APPDATA% installiert werden (Squirrel-Installer).
// Sie registrieren aber ein eigenes URL-Protokoll, das zuverlässig funktioniert.
const PROTOCOL_APPS = {
  discord: 'discord://',
  spotify: 'spotify://',
  'epic games launcher': 'com.epicgames.launcher://',
  'epic games': 'com.epicgames.launcher://',
  epicgames: 'com.epicgames.launcher://',
  epic: 'com.epicgames.launcher://',
  steam: 'steam://open/main',
  whatsapp: 'whatsapp://',
  spotify2: 'spotify://', // Duplikat als Absicherung falls "spotify" umbenannt wird
};

// Diese Namen sind echte, im PATH bekannte Windows-Befehle.
const KNOWN_COMMANDS = {
  chrome: 'chrome',
  notepad: 'notepad',
  taschenrechner: 'calc',
  calculator: 'calc',
  explorer: 'explorer',
  vscode: 'code',
  'visual studio code': 'code',
  outlook: 'outlook',
  paint: 'mspaint',
  taskmanager: 'taskmgr',
  'task-manager': 'taskmgr',
  systemsteuerung: 'control',
  einstellungen: 'ms-settings:',
  browser: 'https://www.google.com',
};

function launchApp(name) {
  const key = name.trim().toLowerCase();

  if (PROTOCOL_APPS[key]) {
    return shell.openExternal(PROTOCOL_APPS[key]).then(() => ({ ok: true })).catch((err) => ({ ok: false, error: err.message }));
  }

  const command = KNOWN_COMMANDS[key] || name.trim();
  return new Promise((resolve) => {
    exec(`start "" "${command}"`, { shell: 'cmd.exe' }, (err) => {
      if (err) resolve({ ok: false, error: err.message });
      else resolve({ ok: true });
    });
  });
}

// Name (wie der Nutzer ihn ausspricht) -> echter Windows-Prozessname (ohne .exe)
const PROCESS_NAMES = {
  discord: 'Discord',
  spotify: 'Spotify',
  chrome: 'chrome',
  notepad: 'notepad',
  taschenrechner: 'CalculatorApp',
  calculator: 'CalculatorApp',
  explorer: 'explorer',
  vscode: 'Code',
  'visual studio code': 'Code',
  outlook: 'OUTLOOK',
  paint: 'mspaint',
  taskmanager: 'Taskmgr',
  steam: 'steam',
  'epic games launcher': 'EpicGamesLauncher',
  'epic games': 'EpicGamesLauncher',
  epicgames: 'EpicGamesLauncher',
  epic: 'EpicGamesLauncher',
  whatsapp: 'WhatsApp',
  opera: 'opera',
  firefox: 'firefox',
  edge: 'msedge',
};

function resolveProcessName(name) {
  const key = name.trim().toLowerCase();
  return PROCESS_NAMES[key] || name.trim();
}

function closeApp(name) {
  const processName = resolveProcessName(name);
  return new Promise((resolve) => {
    // Erst ohne /F versuchen (lässt der App Zeit, ungespeicherte Änderungen abzufragen),
    // bei Fehlschlag mit /F erzwingen.
    exec(`taskkill /IM "${processName}.exe" /T`, (err) => {
      if (!err) return resolve({ ok: true });
      exec(`taskkill /IM "${processName}.exe" /T /F`, (err2) => {
        if (err2) resolve({ ok: false, error: `"${name}" läuft nicht oder konnte nicht geschlossen werden.` });
        else resolve({ ok: true });
      });
    });
  });
}

const MINIMIZE_SCRIPT_PATH = path.join(os.tmpdir(), 'jarvis-minimize.ps1');

function ensureMinimizeScript() {
  if (fs.existsSync(MINIMIZE_SCRIPT_PATH)) return;
  const script = `param([string]$ProcessName)
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinMin {
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$p = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if ($p) { [WinMin]::ShowWindowAsync($p.MainWindowHandle, 6); Write-Output "OK" } else { Write-Output "NOTFOUND" }
`;
  fs.writeFileSync(MINIMIZE_SCRIPT_PATH, script, 'utf-8');
}

function minimizeApp(name) {
  const processName = resolveProcessName(name);
  ensureMinimizeScript();

  return new Promise((resolve) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${MINIMIZE_SCRIPT_PATH}" -ProcessName "${processName}"`, (err, stdout) => {
      if (err || !stdout.includes('OK')) resolve({ ok: false, error: `"${name}" läuft nicht oder hat kein sichtbares Fenster.` });
      else resolve({ ok: true });
    });
  });
}

module.exports = { launchApp, closeApp, minimizeApp };
