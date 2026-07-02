const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const TYPE_SCRIPT_PATH = path.join(os.tmpdir(), 'jarvis-autotype.ps1');

// SendKeys hat Sonderzeichen, die in geschweifte Klammern gesetzt werden müssen,
// da sie sonst als Steuerzeichen interpretiert werden.
function escapeForSendKeys(text) {
  return text.replace(/([+^%~(){}[\]])/g, '{$1}');
}

function ensureScript() {
  if (fs.existsSync(TYPE_SCRIPT_PATH)) return;
  const script = `param([string]$Text)\nAdd-Type -AssemblyName System.Windows.Forms\nStart-Sleep -Milliseconds 400\n[System.Windows.Forms.SendKeys]::SendWait($Text)\n`;
  fs.writeFileSync(TYPE_SCRIPT_PATH, script, 'utf-8');
}

// Tippt Text ins gerade aktive Fenster/Feld, statt es über die Zwischenablage einzufügen -
// hinterlässt so keine Passwort-Reste im Copy/Paste-Verlauf.
function typeText(text) {
  ensureScript();
  const escaped = escapeForSendKeys(text).replace(/"/g, '""');
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${TYPE_SCRIPT_PATH}" -Text "${escaped}"`);
}

module.exports = { typeText };
