const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const DESKTOP_ICONS_SCRIPT = path.join(os.tmpdir(), 'jarvis-toggle-desktop-icons.ps1');
const MUTE_SCRIPT = path.join(os.tmpdir(), 'jarvis-toggle-mute.ps1');
const SET_MUTE_SCRIPT = path.join(os.tmpdir(), 'jarvis-set-mute.ps1');
const PAUSE_MEDIA_SCRIPT = path.join(os.tmpdir(), 'jarvis-pause-media.ps1');

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

// Setzt die Systemlautstärke gezielt auf stumm/laut (im Gegensatz zu toggleMute nicht nur
// umschaltend) - nutzt die Windows-Core-Audio-COM-Schnittstelle IAudioEndpointVolume.
function ensureSetMuteScript() {
  ensureScript(SET_MUTE_SCRIPT, `
param([bool]$Mute, [int]$DataFlow = 0)
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }

public class JarvisVolume {
  public static void SetMute(bool mute, int dataFlow) {
    var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
    IMMDevice dev;
    enumerator.GetDefaultAudioEndpoint(dataFlow, 1, out dev);
    var epvid = typeof(IAudioEndpointVolume).GUID;
    IAudioEndpointVolume epv;
    dev.Activate(ref epvid, 23, 0, out epv);
    epv.SetMute(mute, Guid.Empty);
  }
}
'@
[JarvisVolume]::SetMute($Mute, $DataFlow)
`.trim());
}

// dataFlow: 0 = eRender (Lautsprecher/Ausgabe), 1 = eCapture (Mikrofon/Eingabe)
async function setMuted(mute, dataFlow = 0) {
  ensureSetMuteScript();
  return new Promise((resolve, reject) => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${SET_MUTE_SCRIPT}" -Mute $${mute ? 'true' : 'false'} -DataFlow ${dataFlow}`, (err) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function setMicMuted(mute) {
  return setMuted(mute, 1);
}

// Blockiert den Kamerazugriff über die Windows-Datenschutzeinstellung (Registry) - betrifft
// moderne/UWP-Apps zuverlässig, bei älteren Desktop-Programmen mit eigenem Treiberzugriff
// kann das je nach App variieren. Eine echte Hardware-Deaktivierung der Kamera bräuchte
// Administratorrechte (Disable-PnpDevice) und wurde bewusst nicht genutzt, da sie auch andere,
// evtl. gerade genutzte Programme hart unterbrechen würde.
function setCameraAccessBlocked(blocked) {
  const value = blocked ? 'Deny' : 'Allow';
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\CapabilityAccessManager\\ConsentStore\\webcam" /v Value /t REG_SZ /d "${value}" /f`);
}

// Simuliert die Medien-Play/Pause-Taste - pausiert i.d.R. Spotify/YouTube/etc., unabhängig
// davon, welche App gerade Medien abspielt.
function pauseMedia() {
  ensureScript(PAUSE_MEDIA_SCRIPT, `
Add-Type -TypeDefinition '
using System;
using System.Runtime.InteropServices;
public class JarvisMedia {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
'
[JarvisMedia]::keybd_event(0xB3, 0, 0, [UIntPtr]::Zero)
[JarvisMedia]::keybd_event(0xB3, 0, 2, [UIntPtr]::Zero)
`.trim());
  return runScript(PAUSE_MEDIA_SCRIPT);
}

module.exports = { toggleDesktopIcons, toggleMute, setMuted, setMicMuted, setCameraAccessBlocked, pauseMedia };
