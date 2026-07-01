const { shell } = require('electron');

module.exports = {
  name: 'web_search',
  description: 'Öffnet eine Websuche im Standardbrowser für eine gegebene Suchanfrage.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Der Suchbegriff.' },
    },
    required: ['query'],
  },
  async run({ query }) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await shell.openExternal(url);
    return { result: `Suche nach "${query}" wurde im Browser geöffnet.` };
  },
};
