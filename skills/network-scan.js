const { scanNetwork } = require('../core/network-scan');

module.exports = {
  name: 'scan_network',
  description: 'Scannt das lokale WLAN/Netzwerk nach verbundenen Geräten (IP- und MAC-Adressen) und warnt vor neuen, noch unbekannten Geräten. Nutze dies für "scanne mein Netzwerk", "WLAN-Wächter", "prüf mein Netzwerk". Der Scan dauert einige Sekunden.',
  input_schema: { type: 'object', properties: {} },
  async run() {
    try {
      const scan = await scanNetwork();
      if (scan.isFirstScan) {
        return { result: `Erster Scan: ${scan.devices.length} Geräte im Netzwerk gefunden und als bekannt gespeichert.` };
      }
      if (scan.newDevices.length > 0) {
        const list = scan.newDevices.map((d) => `${d.ip} (${d.mac})`).join(', ');
        return { result: `Warnung: ${scan.newDevices.length} neue, unbekannte Geräte im Netzwerk gefunden: ${list}. Insgesamt ${scan.devices.length} Geräte verbunden.` };
      }
      return { result: `Netzwerk-Scan abgeschlossen: ${scan.devices.length} Geräte gefunden, alle bekannt.` };
    } catch (err) {
      return { error: `Netzwerk-Scan fehlgeschlagen: ${err.message}` };
    }
  },
};
