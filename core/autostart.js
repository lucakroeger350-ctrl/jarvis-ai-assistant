const { exec } = require('child_process');

// Windows verzögert Programme aus dem normalen Registry-"Run"-Autostart-Eintrag
// absichtlich um mehrere Sekunden (Explorer bekommt beim Login Priorität). Ein über
// den Task Scheduler mit Trigger "bei Anmeldung" gestarteter Task hat diese Verzögerung
// nicht - JARVIS startet dadurch direkt nach dem Windows-Login statt erst ~10s später.
const TASK_NAME = 'JARVIS_Autostart';

function enable(exePath) {
  const cmd = `schtasks /create /tn "${TASK_NAME}" /tr "\\"${exePath}\\"" /sc onlogon /rl limited /f`;
  exec(cmd, (err) => {
    if (err) console.warn('Autostart-Task konnte nicht angelegt werden:', err.message);
  });
}

function disable() {
  exec(`schtasks /delete /tn "${TASK_NAME}" /f`, () => {
    // Fehler (z.B. "Task existiert nicht") ist unkritisch - dann war eh nichts zu löschen.
  });
}

module.exports = { enable, disable };
