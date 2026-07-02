const { buildDailyBriefing } = require('../core/weather-news');

module.exports = {
  name: 'daily_briefing',
  description: 'Gibt ein Tagesbriefing: aktuelles Wetter am Standort des Nutzers plus die 3 wichtigsten Nachrichten-Schlagzeilen. Nutze dies für "Daily Briefing", "was gibt es Neues", "gib mir ein Update".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    try {
      const briefing = await buildDailyBriefing();
      return { result: briefing.text };
    } catch (err) {
      return { error: `Briefing konnte nicht abgerufen werden: ${err.message}` };
    }
  },
};
