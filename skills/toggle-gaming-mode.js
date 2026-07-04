const gamingMode = require('../core/gaming-mode');
const gamingBridge = require('../core/gaming-bridge');

module.exports = {
  name: 'toggle_gaming_mode',
  description: 'Aktiviert oder deaktiviert den Gaming Mode manuell per Sprachbefehl: minimiert JARVIS zu einer kleinen Kugel oben rechts und schließt nicht-essenzielle Hintergrund-Apps (Chrome, Edge, OneDrive, Teams). Nutze dies für "starte den Gaming Mode", "Gaming Mode an/aus". WICHTIG: Dieses Tool NIEMALS mit shutdown_pc oder night_protocol verwechseln - Gaming Mode fährt den PC nicht herunter.',
  input_schema: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean', description: 'true zum Aktivieren, false zum Deaktivieren/Wiederherstellen.' },
    },
    required: ['enabled'],
  },
  async run({ enabled }) {
    if (enabled) {
      if (gamingMode.isOverlayActive()) return { result: 'Gaming Mode läuft bereits, Sir.' };
      gamingBridge.enter();
      return { result: 'Gaming Mode aktiviert, Sir. Ich minimiere mich und räume den Arbeitsspeicher auf.' };
    }
    if (!gamingMode.isOverlayActive()) return { result: 'Gaming Mode war gar nicht aktiv, Sir.' };
    gamingBridge.exit();
    return { result: 'Gaming Mode beendet, Sir. Willkommen zurück.' };
  },
};
