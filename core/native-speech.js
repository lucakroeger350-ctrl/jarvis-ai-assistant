const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const { EventEmitter } = require('events');

const SCRIPT_PATH = path.join(__dirname, '..', 'native', 'recognize.ps1');
const FILE_SCRIPT_PATH = path.join(__dirname, '..', 'native', 'recognize-file.ps1');

function transcribeFile(wavPath, culture = 'de-DE') {
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', FILE_SCRIPT_PATH,
      '-Path', wavPath,
      '-Culture', culture,
    ], { windowsHide: true });

    let output = '';
    proc.stdout.on('data', (d) => { output += d.toString(); });
    proc.on('exit', () => {
      const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'transcript') return resolve(msg.text);
          if (msg.type === 'error') return reject(new Error(msg.message));
        } catch {
          // ignore
        }
      }
      reject(new Error('Keine Transkription erhalten.'));
    });
    proc.on('error', reject);
  });
}

const MAX_CONSECUTIVE_CRASHES = 3;

class NativeSpeechRecognizer extends EventEmitter {
  constructor() {
    super();
    this.proc = null;
    this.stopped = true;
    this.consecutiveCrashes = 0;
    this.gotReadyThisRun = false;
  }

  start(culture = 'de-DE') {
    this.stop();
    this.stopped = false;
    this.culture = culture;
    this.gotReadyThisRun = false;

    this.proc = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', SCRIPT_PATH,
      '-Culture', culture,
    ], { windowsHide: true });

    const rl = readline.createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => {
      line = line.trim();
      if (!line) return;
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'ready') {
          this.gotReadyThisRun = true;
          this.consecutiveCrashes = 0; // erfolgreicher Start setzt den Zähler zurück
          this.emit('ready');
        } else if (msg.type === 'partial') this.emit('partial', msg.text);
        else if (msg.type === 'final') this.emit('final', msg.text);
        else if (msg.type === 'error') this.emit('error', new Error(msg.message));
      } catch {
        // ignore non-JSON noise
      }
    });

    this.proc.stderr.on('data', (data) => {
      this.emit('stderr', data.toString());
    });

    this.proc.on('exit', (code) => {
      this.proc = null;
      if (this.stopped) return;

      this.consecutiveCrashes += 1;
      if (this.consecutiveCrashes > MAX_CONSECUTIVE_CRASHES) {
        this.stopped = true;
        this.emit('error', new Error('Spracherkennung konnte nach mehreren Versuchen nicht gestartet werden (evtl. kein Mikrofon oder kein Windows-Sprachpaket für diese Sprache installiert).'));
        return;
      }

      this.emit('crashed', code);
      setTimeout(() => { if (!this.stopped) this.start(this.culture); }, 1500);
    });
  }

  stop() {
    this.stopped = true;
    this.consecutiveCrashes = 0;
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }
}

module.exports = { NativeSpeechRecognizer, transcribeFile };
