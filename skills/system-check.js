const { checkSystem } = require('../core/hardware-monitor');

module.exports = {
  name: 'system_check',
  description: 'Prüft aktuelle CPU-Auslastung, RAM-Auslastung und (falls verfügbar) CPU-Temperatur. Nutze dies für "wie ist die Systemauslastung", "System-Check".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const status = await checkSystem();
    const tempText = status.cpuTemp != null ? `${status.cpuTemp}°C` : 'nicht verfügbar auf dieser Hardware';
    return {
      result: `CPU-Auslastung: ${status.cpuLoad}%, RAM-Auslastung: ${status.ramPercent}%, CPU-Temperatur: ${tempText}.`,
    };
  },
};
