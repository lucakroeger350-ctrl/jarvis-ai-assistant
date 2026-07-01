const { exec } = require('child_process');
const { shell } = require('electron');

// Manche Apps (Discord, Spotify, ...) sind unter Windows nicht als PATH-Befehl aufrufbar,
// da sie pro Nutzer in %LOCALAPPDATA%/%APPDATA% installiert werden (Squirrel-Installer).
// Sie registrieren aber ein eigenes URL-Protokoll, das zuverlässig funktioniert.
const PROTOCOL_APPS = {
  discord: 'discord://',
  spotify: 'spotify://',
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
  steam: 'steam',
  outlook: 'outlook',
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

module.exports = { launchApp };
