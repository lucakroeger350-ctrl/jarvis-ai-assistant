const securityGuard = require('../core/security-guard');
const visualizerBridge = require('../core/visualizer-bridge');

module.exports = {
  name: 'toggle_camera_guard',
  description: 'Aktiviert oder deaktiviert den Matrix-Kamera-Schutz (Gesichtserkennungs-Wächter). Nutze dies für "Matrix-Schutz aktivieren", "Kamera-Wächter einschalten/ausschalten". Setzt voraus, dass in den Einstellungen bereits ein Gesicht registriert und eine PIN gesetzt wurde.',
  input_schema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'true zum Aktivieren, false zum Deaktivieren.' },
    },
    required: ['enabled'],
  },
  async run({ enabled }) {
    const status = securityGuard.getStatus();
    if (enabled && (!status.hasFace || !status.hasPin)) {
      return { error: 'Für den Matrix-Kamera-Schutz muss zuerst in den Einstellungen ein Gesicht registriert und eine PIN gesetzt werden, Sir.' };
    }
    securityGuard.setArmed(enabled);
    securityGuard.setEnabled(enabled);
    visualizerBridge.send('security:armed-changed', { armed: enabled });
    return { result: enabled ? 'Matrix-Kamera-Schutz ist jetzt aktiv, Sir.' : 'Matrix-Kamera-Schutz wurde deaktiviert, Sir.' };
  },
};
