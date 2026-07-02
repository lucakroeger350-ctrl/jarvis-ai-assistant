const { getWorldTimes } = require('../core/world-time');
const visualizerBridge = require('../core/visualizer-bridge');

module.exports = {
  name: 'world_time',
  description: 'Zeigt die aktuelle Uhrzeit in Berlin, New York und Tokio und lässt den Globus dorthin schwenken. Nutze dies für "Weltzeit-Status", "wie spät ist es in Tokio".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const times = getWorldTimes();
    visualizerBridge.send('globe:focus-cities', { cities: times });

    const text = times.map((t) => `${t.name}: ${t.time} Uhr`).join(', ');
    return { result: `Weltzeit-Synchronisation abgeschlossen, Sir. ${text}.` };
  },
};
