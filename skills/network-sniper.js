const networkSniper = require('../core/network-sniper');
const visualizerBridge = require('../core/visualizer-bridge');

module.exports = {
  name: 'toggle_network_sniper',
  description: 'Aktiviert/deaktiviert den Netzwerk-Sniper: überwacht die Ping-Latenz und drosselt bei Spitzen automatisch Bandbreiten-Fresser im Hintergrund (Chrome, Edge, OneDrive, Teams), um dem Spiel/der Verbindung Vorrang zu geben. Nutze dies für "Netzwerk-Sniper aktivieren/deaktivieren". HINWEIS: Echte Drosselung benötigt in der Regel Administratorrechte für JARVIS.',
  input_schema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'true zum Aktivieren, false zum Deaktivieren.' },
    },
    required: ['enabled'],
  },
  async run({ enabled }) {
    if (enabled) {
      networkSniper.startWatcher((event, ping) => {
        const text = event === 'throttle-on'
          ? `Ping-Spitze erkannt (${ping}ms) - Hintergrund-Apps werden gedrosselt, Sir.`
          : `Verbindung stabilisiert (${ping}ms) - Drosselung aufgehoben, Sir.`;
        visualizerBridge.send('app:announce', { text });
      });
      return { result: 'Netzwerk-Sniper ist jetzt aktiv, Sir.' };
    }
    networkSniper.stopWatcher();
    return { result: 'Netzwerk-Sniper wurde deaktiviert, Sir.' };
  },
};
