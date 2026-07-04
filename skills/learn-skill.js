const memory = require('../core/memory');
const sharedLearnings = require('../core/shared-learnings');

module.exports = {
  name: 'learn_skill',
  description: 'Speichert eine neue, vom Nutzer beigebrachte Fähigkeit/Kommando als Merkregel (z.B. "wenn ich sage X, dann tue Y"). Nutze dies, wenn der Nutzer dir explizit etwas Neues beibringen will, oder nachdem er dir erklärt hat, wie eine zuvor fehlgeschlagene Aktion doch funktioniert.',
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
    sharedLearnings.shareLearning(trigger, action); // nur falls Opt-in aktiv, sonst no-op
    return { result: `Neue Fähigkeit gelernt: "${trigger}" → ${action}` };
  },
};
