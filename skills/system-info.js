const os = require('os');

function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

module.exports = {
  name: 'system_info',
  description: 'Liefert Systeminformationen: aktuelle Uhrzeit, Datum, CPU-Auslastung, RAM-Nutzung, Betriebssystem.',
  input_schema: {
    type: 'object',
    properties: {},
  },
  async run() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const now = new Date();

    return {
      result: {
        zeit: now.toLocaleTimeString('de-DE'),
        datum: now.toLocaleDateString('de-DE'),
        betriebssystem: `${os.type()} ${os.release()}`,
        cpu: os.cpus()[0]?.model || 'unbekannt',
        anzahlKerne: os.cpus().length,
        ram_gesamt: formatBytes(totalMem),
        ram_belegt: formatBytes(usedMem),
        laufzeit_stunden: (os.uptime() / 3600).toFixed(1),
      },
    };
  },
};
