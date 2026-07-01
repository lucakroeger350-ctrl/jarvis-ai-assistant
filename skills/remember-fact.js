const memory = require('../core/memory');

module.exports = {
  name: 'remember_fact',
  description: 'Speichert dauerhaft eine Information, eine Vorliebe des Nutzers oder eine Korrektur/Feedback, damit du in Zukunft daraus lernst. Nutze dies immer, wenn der Nutzer sagt "merk dir...", dir etwas über sich erzählt, oder dich korrigiert ("das war falsch, eigentlich...").',
  input_schema: {
    type: 'object',
    properties: {
      fact: { type: 'string', description: 'Die zu merkende Information, kurz und klar formuliert.' },
    },
    required: ['fact'],
  },
  async run({ fact }) {
    memory.addMemoryFact(fact);
    return { result: `Verstanden, ich merke mir: "${fact}"` };
  },
};
