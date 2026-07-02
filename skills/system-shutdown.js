const { exec } = require('child_process');

module.exports = {
  name: 'shutdown_pc',
  description: 'Fährt den PC herunter. WICHTIG: Frage den Nutzer IMMER erst explizit "Bist du sicher, dass ich den PC herunterfahren soll?" und rufe dieses Tool nur mit confirmed=true auf, wenn der Nutzer das in einer separaten Nachricht ausdrücklich bestätigt hat (z.B. "ja", "ja, herunterfahren"). Rufe es niemals beim ersten Mal direkt mit confirmed=true auf.',
  input_schema: {
    type: 'object',
    properties: {
      confirmed: { type: 'boolean', description: 'Muss true sein, und zwar nur nachdem der Nutzer in einer eigenen Nachricht ausdrücklich bestätigt hat.' },
    },
    required: ['confirmed'],
  },
  async run({ confirmed }) {
    if (!confirmed) {
      return { result: 'Frage den Nutzer zuerst, ob er wirklich sicher ist, und rufe dieses Tool erst nach seiner Bestätigung erneut mit confirmed=true auf.' };
    }
    return new Promise((resolve) => {
      exec('shutdown /s /t 30', (err) => {
        if (err) resolve({ error: `Herunterfahren fehlgeschlagen: ${err.message}` });
        else resolve({ result: 'PC fährt in 30 Sekunden herunter. Sag "Herunterfahren abbrechen", um es zu stoppen.' });
      });
    });
  },
};
