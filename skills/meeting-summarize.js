const { shell } = require('electron');
const meeting = require('../core/meeting');
const { transcribeFile } = require('../core/native-speech');
const { summarizeTranscript } = require('../core/summarizer');
const { saveMeetingSummaryPdf } = require('../core/pdf');

module.exports = {
  name: 'summarize_meeting',
  description: 'Beendet die laufende Meeting-Aufnahme, transkribiert sie und erstellt eine PDF-Zusammenfassung mit den wichtigsten Punkten, Entscheidungen und offenen Aufgaben. Nutze dies, wenn der Nutzer sagt "fasse das Meeting zusammen" o.ä.',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const wavPath = await meeting.requestStop();
    if (!wavPath) return { error: 'Es läuft gerade keine Aufnahme, die ich zusammenfassen könnte.' };

    let transcript;
    try {
      transcript = await transcribeFile(wavPath);
    } catch (err) {
      return { error: `Transkription fehlgeschlagen: ${err.message}` };
    }

    if (!transcript || !transcript.trim()) {
      return { error: 'Es wurde kein verständlicher Ton in der Aufnahme erkannt.' };
    }

    let summary;
    try {
      summary = await summarizeTranscript(transcript);
    } catch (err) {
      return { error: `Zusammenfassung fehlgeschlagen: ${err.message}` };
    }

    const pdfPath = await saveMeetingSummaryPdf(summary);
    shell.openPath(pdfPath);

    return { result: `Zusammenfassung erstellt und als PDF gespeichert unter ${pdfPath}. Ich habe sie gerade geöffnet.` };
  },
};
