const aiClient = require('./ai-client');

const PROMPT_PREFIX = 'Du bekommst das Rohtranskript eines Meetings (automatisch per Spracherkennung erstellt, kann Fehler enthalten). ' +
  'Erstelle eine strukturierte Zusammenfassung auf Deutsch mit diesen Abschnitten: ' +
  '"Wichtigste Themen", "Entscheidungen", "Offene Punkte / Action Items". ' +
  'Sei präzise und kurz, nutze Stichpunkte. Wenn etwas unklar ist, kennzeichne es als unsicher.\n\nTranskript:\n';

async function summarizeTranscript(transcript) {
  return aiClient.complete(PROMPT_PREFIX + transcript);
}

module.exports = { summarizeTranscript };
