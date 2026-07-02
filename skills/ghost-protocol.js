const { activateGhostProtocol, deactivateGhostProtocol } = require('../core/ghost-protocol');

module.exports = {
  name: 'toggle_ghost_protocol',
  description: 'Ghost Protocol: schaltet Systemton und Mikrofon stumm, pausiert Medienwiedergabe und blockiert den Kamerazugriff. Nutze dies für "Protokoll Geist", "Ghost Protocol aktivieren/deaktivieren". HINWEIS: Automatisiert bewusst NICHT den Discord-Status (würde gegen Discords Nutzungsbedingungen verstoßen).',
  input_schema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'true zum Aktivieren, false zum Deaktivieren.' },
    },
    required: ['enabled'],
  },
  async run({ enabled }) {
    if (enabled) {
      await activateGhostProtocol();
      return { result: 'Ghost Protocol aktiviert, Sir.' };
    }
    await deactivateGhostProtocol();
    return { result: 'Ghost Protocol deaktiviert, Sir.' };
  },
};
