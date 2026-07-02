const { activateStealthMode } = require('../core/stealth-mode');

module.exports = {
  name: 'activate_stealth_mode',
  description: 'Boss-Key/Tarnmodus: minimiert alle Fenster, schaltet den Ton stumm und öffnet ein unauffälliges Word-Dokument. Läuft absichtlich lautlos ohne Sprachausgabe. Nutze dies für "Tarnung", "Boss-Key", "Ghost Protocol aktivieren".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    await activateStealthMode();
    return { result: '' };
  },
};
