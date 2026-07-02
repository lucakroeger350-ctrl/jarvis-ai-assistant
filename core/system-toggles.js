const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const DESKTOP_ICONS_SCRIPT = path.join(os.tmpdir(), 'jarvis-toggle-desktop-icons.ps1');
const MUTE_SCRIPT = path.join(os.tmpdir(), 'jarvis-toggle-mute.ps1');

function ensureScript(filePath, content) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content, 'utf-8');
}

function runScript(filePath) {
  return new Promise((resolve, reject) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${filePath}"`, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

// Blendet die Desktop-Symbole per Win32-API ein/aus, ohne den Explorer neu zu starten.
async function toggleDesktopIcons() {
  ensureScript(DESKTOP_ICONS_SCRIPT, `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class JarvisDesktop {
  [DllImport("user32.dll")] public static extern IntPtr FindWindow(string cls, string win);
  [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr child, string cls, string win);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int cmd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
}
'
$workerW = [JarvisDesktop]::FindWindow("Progman", $null)
$defView = [JarvisDesktop]::FindWindowEx($workerW, [IntPtr]::Zero, "SHELLDLL_DefView", $null)
$listView = [JarvisDesktop]::FindWindowEx($defView, [IntPtr]::Zero, "SysListView32", "FolderView")
$visible = [JarvisDesktop]::IsWindowVisible($listView)
if ($visible) { [JarvisDesktop]::ShowWindow($listView, 0); Write-Output "hidden" }
else { [JarvisDesktop]::ShowWindow($listView, 5); Write-Output "shown" }
`.trim());
  return runScript(DESKTOP_ICONS_SCRIPT);
}

// Schaltet die Systemlautstärke stumm/laut, indem die Mute-Medientaste simuliert wird.
async function toggleMute() {
  ensureScript(MUTE_SCRIPT, `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class JarvisAudio {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
'
[JarvisAudio]::keybd_event(0xAD, 0, 0, [UIntPtr]::Zero)
[JarvisAudio]::keybd_event(0xAD, 0, 2, [UIntPtr]::Zero)
`.trim());
  return runScript(MUTE_SCRIPT);
}

module.exports = { toggleDesktopIcons, toggleMute };
