const { shell } = require('electron');
const fs = require('fs');

module.exports = {
  name: 'open_path',
  description: 'Öffnet eine Datei oder einen Ordner auf dem PC anhand des vollständigen Pfades.',
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Vollständiger Datei- oder Ordnerpfad, z.B. C:\\Users\\Name\\Documents' },
    },
    required: ['path'],
  },
  async run({ path: targetPath }, { permissions }) {
    if (!permissions.files) return { error: 'Berechtigung für Dateizugriff ist deaktiviert.' };
    if (!fs.existsSync(targetPath)) return { error: `Pfad nicht gefunden: ${targetPath}` };

    const err = await shell.openPath(targetPath);
    if (err) return { error: `Konnte Pfad nicht öffnen: ${err}` };
    return { result: `${targetPath} wurde geöffnet.` };
  },
};
