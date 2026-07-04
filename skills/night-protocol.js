const { exec } = require('child_process');
const memory = require('../core/memory');
const visualizerBridge = require('../core/visualizer-bridge');
const screenManager = require('../core/screen-manager');
const { minimizeAllWindows, buildGoodbyeMessage } = require('../core/night-protocol');

module.exports = {
  name: 'night_protocol',
  description: 'Startet das "Gute Nacht"-Protokoll: minimiert alle Fenster, dunkelt den Bildschirm ab, verabschiedet sich und fährt den PC danach herunter. WICHTIG: Frage den Nutzer IMMER erst explizit, ob er sicher ist, und rufe dieses Tool nur mit confirmed=true auf, nachdem der Nutzer das in einer separaten Nachricht ausdrücklich bestätigt hat. Rufe es niemals beim ersten Mal direkt mit confirmed=true auf.',
  input_schema: {
    type: 'object',
    properties: {
      confirmed: { type: 'boolean', description: 'Muss true sein, und zwar nur nachdem der Nutzer in einer eigenen Nachricht ausdrücklich bestätigt hat.' },
    },
    required: ['confirmed'],
  },
  async run({ confirmed }) {
    if (!confirmed) {
      return { result: 'Frage den Nutzer zuerst, ob er wirklich sicher ist, dass das Gute-Nacht-Protokoll gestartet werden soll, und rufe dieses Tool erst nach seiner Bestätigung erneut mit confirmed=true auf.' };
    }

    const settings = memory.getSettings();
    const text = buildGoodbyeMessage(settings.userName);

    await minimizeAllWindows();
    // Cinematische Shutdown-Projektion über alle Monitore: Kugel + Abschiedsansage
    // auf dem Hauptmonitor, weitere Monitore stylisch schwarz. Fällt bei nur einem
    // Monitor automatisch auf ein einzelnes Vollbild zurück.
    screenManager.open('shutdown', 'orb', 'black', { text });
    visualizerBridge.send('app:announce', { text });

    setTimeout(() => {
      exec('shutdown /s /t 15');
    }, 8000);

    return { result: `Gute-Nacht-Protokoll gestartet. ${text} Der PC fährt in Kürze herunter.` };
  },
};
