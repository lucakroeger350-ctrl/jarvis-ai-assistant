const { researchTopic } = require('../core/research-drone');

module.exports = {
  name: 'research_topic',
  description: 'KI-Forschungs-Drohne: recherchiert ein Thema im Hintergrund (durchsucht das Web, fasst mehrere Quellen zusammen) und speichert eine strukturierte .txt-Datei auf dem Desktop. Nutze dies für "Jarvis, recherchiere [Thema]". Nur auf aktive Anfrage, nie unaufgefordert.',
  input_schema: {
    type: 'object',
    properties: {
      topic: { type: 'string', description: 'Das zu recherchierende Thema.' },
    },
    required: ['topic'],
  },
  async run({ topic }) {
    try {
      const { filePath, summary, sourceCount } = await researchTopic(topic);
      return { result: `Recherche zu "${topic}" abgeschlossen, Sir. ${sourceCount} Quellen ausgewertet, Datei gespeichert unter ${filePath}. Zusammenfassung: ${summary}` };
    } catch (err) {
      return { error: err.message };
    }
  },
};
