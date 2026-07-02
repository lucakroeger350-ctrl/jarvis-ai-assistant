const { runCleanupProtocol } = require('../core/cleanup-protocol');

module.exports = {
  name: 'cleanup_protocol',
  description: 'Protokoll Bereinigung: leert den Papierkorb und den temporären Ordner (%TEMP%), meldet danach den freigegebenen Speicherplatz. Nutze dies für "Protokoll Bereinigung", "System aufräumen".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const { freedMb, filesRemoved } = await runCleanupProtocol();
    return { result: `Bereinigung abgeschlossen, Sir. ${filesRemoved} temporäre Dateien entfernt, Papierkorb geleert, ${freedMb} MB Speicherplatz freigegeben.` };
  },
};
