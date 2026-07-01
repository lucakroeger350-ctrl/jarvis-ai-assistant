const { shell } = require('electron');
const { launchApp } = require('../core/launcher');

module.exports = {
  name: 'open_app',
  description: 'Öffnet ein Programm auf dem PC (z.B. Discord, Chrome, Spotify, Notepad) oder eine Webseite/URL.',
  input_schema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Name des Programms (z.B. "discord", "spotify") oder eine vollständige URL (z.B. "https://google.com").',
      },
    },
    required: ['target'],
  },
  async run({ target }, { permissions }) {
    if (!permissions.apps) return { error: 'Berechtigung zum Starten von Programmen ist deaktiviert.' };

    const t = target.trim();
    if (/^https?:\/\//i.test(t)) {
      await shell.openExternal(t);
      return { result: `Öffne ${t} im Browser.` };
    }

    const res = await launchApp(t);
    if (!res.ok) return { error: `Konnte "${t}" nicht starten: ${res.error}` };
    return { result: `${t} wird gestartet.` };
  },
};
