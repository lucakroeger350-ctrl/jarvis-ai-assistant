const visualizerBridge = require('../core/visualizer-bridge');

module.exports = {
  name: 'focus_mode',
  description: 'Startet den Fokus-Modus für eine bestimmte Anzahl Minuten: die Oberfläche wechselt in ein ruhiges, konzentriertes Design mit Countdown. Nutze dies für "Fokus-Modus für X Minuten", "starte eine Konzentrationsphase".',
  input_schema: {
    type: 'object',
    properties: {
      minutes: { type: 'number', description: 'Dauer des Fokus-Modus in Minuten.' },
    },
    required: ['minutes'],
  },
  async run({ minutes }) {
    const duration = Math.max(1, Math.round(minutes));
    visualizerBridge.send('focus:start', { minutes: duration });
    return { result: `Fokus-Modus für ${duration} Minuten gestartet, Sir. Ich melde mich, sobald die Zeit um ist.` };
  },
};
