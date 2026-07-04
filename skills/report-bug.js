const { submitBugReport } = require('../core/bug-report');

module.exports = {
  name: 'report_bug',
  description: 'Meldet einen Fehler/Bug an die Entwickler (landet in der zentralen Datenbank, nicht nur lokal). Nutze dies, wenn der Nutzer sagt "melde einen Bug", "das ist ein Fehler, melde das", "Bug Report" o.ä.',
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'Beschreibung des Problems in den Worten des Nutzers.' },
    },
    required: ['description'],
  },
  async run({ description }) {
    try {
      await submitBugReport(description);
      return { result: 'Danke, Sir. Der Bug wurde gemeldet und landet bei den Entwicklern.' };
    } catch (err) {
      return { error: `Bug-Report konnte nicht gesendet werden: ${err.message}` };
    }
  },
};
