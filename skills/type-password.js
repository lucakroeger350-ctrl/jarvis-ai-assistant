const passwordVault = require('../core/password-vault');
const vaultBridge = require('../core/vault-bridge');

module.exports = {
  name: 'type_password',
  description: 'Öffnet den Passwort-Tresor für einen Eintrag und tippt das Passwort nach PIN-Eingabe automatisch ins aktive Textfeld. Nutze dies für "Jarvis, gib mein Passwort für X ein", "Tresor öffnen für X". WICHTIG: Die PIN wird NIE über den Chat abgefragt oder übermittelt - dafür öffnet sich ein eigenes, sicheres Eingabefenster.',
  input_schema: {
    type: 'object',
    properties: {
      label: { type: 'string', description: 'Name/Bezeichnung des gesuchten Tresor-Eintrags, z.B. "Amazon" oder "E-Mail".' },
    },
    required: ['label'],
  },
  async run({ label }) {
    const entry = passwordVault.findByLabel(label);
    if (!entry) return { error: `Kein Tresor-Eintrag gefunden, der zu "${label}" passt, Sir.` };
    vaultBridge.open(entry);
    return { result: `Ich habe das Tresor-Eingabefenster für "${entry.label}" geöffnet, Sir. Bitte geben Sie dort Ihre PIN ein.` };
  },
};
