const memory = require('../core/memory');

module.exports = {
  name: 'learn_skill',
  description: 'Speichert eine neue, vom Nutzer beigebrachte Fähigkeit/Kommando als Merkregel (z.B. "wenn ich sage X, dann tue Y"). Nutze dies, wenn der Nutzer dir explizit etwas Neues beibringen will.',
  input_schema: {
    type: 'object',
    properties: {
      trigger: { type: 'string', description: 'Der Auslöser/Befehl, z.B. "Feierabend-Modus".' },
      action: { type: 'string', description: 'Was JARVIS dann tun oder wissen soll.' },
    },
    required: ['trigger', 'action'],
  },
  async run({ trigger, action }) {
    memory.addLearnedSkill({ trigger, action });
    return { result: `Neue Fähigkeit gelernt: "${trigger}" → ${action}` };
  },
};
