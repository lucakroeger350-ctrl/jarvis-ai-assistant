const visualizerBridge = require('../core/visualizer-bridge');

module.exports = {
  name: 'toggle_music_visualizer',
  description: 'Schaltet den Musik-Visualizer (die Wellenform-Anzeige, die sich im Takt der Windows-Systemaudio bewegt) an oder aus. Nutze dies für "Musik-Visualizer an/aus", "zeig den Visualizer".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const active = visualizerBridge.toggle();
    return { result: active ? 'Musik-Visualizer aktiviert.' : 'Musik-Visualizer deaktiviert.' };
  },
};
