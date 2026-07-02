const { runSpeedtest } = require('../core/network-speed');

module.exports = {
  name: 'speedtest',
  description: 'Testet Internet-Ping und Download-Geschwindigkeit. Nutze dies für "wie ist mein Ping", "teste mein Internet", "Speedtest".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    try {
      const result = await runSpeedtest();
      return { result: `Ping: ${result.pingMs} Millisekunden. Download-Geschwindigkeit: ${result.downloadMbps} Megabit pro Sekunde.` };
    } catch (err) {
      return { error: `Speedtest fehlgeschlagen: ${err.message}` };
    }
  },
};
