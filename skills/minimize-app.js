const { minimizeApp } = require('../core/launcher');

module.exports = {
  name: 'minimize_app',
  description: 'Minimiert das Fenster eines laufenden Programms (legt es in die Taskleiste), ohne es zu schließen. Nutze dies für "minimiere X".',
  input_schema: {
    type: 'object',
    properties: {
      target: { type: 'string', description: 'Name des zu minimierenden Programms, z.B. "discord".' },
    },
    required: ['target'],
  },
  async run({ target }, { permissions }) {
    if (!permissions.apps) return { error: 'Berechtigung zum Steuern von Programmen ist deaktiviert.' };
    const res = await minimizeApp(target);
    if (!res.ok) return { error: res.error };
    return { result: `${target} wurde minimiert.` };
  },
};
