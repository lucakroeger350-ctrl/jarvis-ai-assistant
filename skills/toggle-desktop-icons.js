const { toggleDesktopIcons } = require('../core/system-toggles');

module.exports = {
  name: 'toggle_desktop_icons',
  description: 'Blendet die Desktop-Symbole ein oder aus. Nutze dies für "Desktop verstecken", "Desktop-Icons ausblenden", "zeig meinen Desktop wieder an".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const state = await toggleDesktopIcons();
    return { result: state === 'hidden' ? 'Desktop-Symbole sind jetzt ausgeblendet, Sir.' : 'Desktop-Symbole sind wieder sichtbar, Sir.' };
  },
};
