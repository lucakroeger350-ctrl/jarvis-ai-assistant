const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const memory = require('./memory');

const PROMPT_PREFIX = 'Du bekommst das Rohtranskript eines Meetings (automatisch per Spracherkennung erstellt, kann Fehler enthalten). ' +
  'Erstelle eine strukturierte Zusammenfassung auf Deutsch mit diesen Abschnitten: ' +
  '"Wichtigste Themen", "Entscheidungen", "Offene Punkte / Action Items". ' +
  'Sei präzise und kurz, nutze Stichpunkte. Wenn etwas unklar ist, kennzeichne es als unsicher.\n\nTranskript:\n';

async function summarizeTranscript(transcript) {
  const settings = memory.getSettings();
  if (!settings.apiKey) throw new Error(`Kein ${settings.provider === 'anthropic' ? 'Anthropic' : 'Gemini'}-API-Schlüssel hinterlegt.`);

  if (settings.provider === 'anthropic') {
    const client = new Anthropic({ apiKey: settings.apiKey });
    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: PROMPT_PREFIX + transcript }],
    });
    return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  }

  const genAI = new GoogleGenerativeAI(settings.apiKey);
  const model = genAI.getGenerativeModel({ model: settings.model || 'gemini-2.5-flash' });
  const result = await model.generateContent(PROMPT_PREFIX + transcript);
  return result.response.text();
}

module.exports = { summarizeTranscript };
