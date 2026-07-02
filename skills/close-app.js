const { closeApp } = require('../core/launcher');

module.exports = {
  name: 'close_app',
  description: 'Schließt/beendet ein laufendes Programm (z.B. Discord, Spotify, Chrome). Nutze dies für "schließe X", "beende X". Das ist NICHT dasselbe wie shutdown_pc (das fährt den ganzen PC herunter) - verwechsle diese beiden Tools nicht.',
  input_schema: {
    type: 'object',
    properties: {
      target: { type: 'string', description: 'Name des zu schließenden Programms, z.B. "discord".' },
    },
    required: ['target'],
  },
  async run({ target }, { permissions }) {
    if (!permissions.apps) return { error: 'Berechtigung zum Steuern von Programmen ist deaktiviert.' };
    const res = await closeApp(target);
    if (!res.ok) return { error: res.error };
    return { result: `${target} wurde geschlossen.` };
  },
};
