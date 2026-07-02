const { clipboard } = require('electron');
const brain = require('../core/brain');

module.exports = {
  name: 'summarize_clipboard',
  description: 'Fasst den aktuell in der Zwischenablage kopierten Text in maximal 3 Kernpunkten/Sätzen zusammen. Nutze dies für "Jarvis, fasse das zusammen", nachdem der Nutzer einen Text kopiert hat.',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const text = clipboard.readText();
    if (!text || text.trim().length < 20) {
      return { error: 'In der Zwischenablage ist kein längerer Text vorhanden, Sir.' };
    }
    const prompt = `Fasse den folgenden Text in maximal 3 Sätzen mit den wichtigsten Kernpunkten zusammen (Deutsch, klar und sprechbar, keine Aufzählungszeichen):\n\n${text.slice(0, 8000)}`;
    const summary = await brain.summarizeText(prompt);
    return { result: summary.trim() };
  },
};
