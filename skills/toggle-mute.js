const { toggleMute } = require('../core/system-toggles');

module.exports = {
  name: 'toggle_mute',
  description: 'Schaltet die Systemlautstärke stumm oder wieder laut. Nutze dies für "Ton aus", "stumm schalten", "Ton wieder an".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    await toggleMute();
    return { result: 'Erledigt, Sir. Die Lautstärke wurde umgeschaltet.' };
  },
};
