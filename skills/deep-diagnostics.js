const { runDeepDiagnostics } = require('../core/deep-diagnostics');

module.exports = {
  name: 'deep_diagnostics',
  description: 'Tiefendiagnose: minimiert JARVIS, zeigt einen visuellen Sicherheits-Scan-Effekt und meldet danach den echten System-Status (CPU/RAM). Nutze dies für "Starte Tiefen-Diagnose".',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const status = await runDeepDiagnostics();
    if (!status) return { result: 'Tiefendiagnose abgeschlossen, Sir. Der genaue System-Status konnte nicht ermittelt werden.' };
    return { result: `Tiefendiagnose abgeschlossen, Sir. Alle Systeme optimiert. CPU-Auslastung ${status.cpuLoad} Prozent, Arbeitsspeicher ${status.ramPercent} Prozent.` };
  },
};
