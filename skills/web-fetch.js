function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  name: 'web_fetch',
  description: 'Ruft den Textinhalt einer Webseite ab, um Informationen nachzuschlagen (z.B. wenn du nicht weißt, wie man etwas macht, oder aktuelle Infos brauchst). Nutze dies zusammen mit web_search: erst suchen, dann eine vielversprechende URL hier abrufen. Wenn du dadurch lernst, wie man etwas Neues tut (z.B. ein Programm öffnen), speichere es danach mit remember_fact oder learn_skill, damit du es dir merkst.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Die vollständige URL, die abgerufen werden soll.' },
    },
    required: ['url'],
  },
  async run({ url }) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (JARVIS Assistant)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return { error: `Seite antwortete mit Status ${response.status}.` };
      const html = await response.text();
      const text = stripHtml(html).slice(0, 6000);
      return { result: text || 'Seite enthielt keinen lesbaren Text.' };
    } catch (err) {
      return { error: `Abruf fehlgeschlagen: ${err.message}` };
    }
  },
};
