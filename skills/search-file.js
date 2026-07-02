const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');

const SEARCH_ROOTS = ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Videos', 'Music'];
const MAX_DEPTH = 6;

function findFile(rootDir, needle, depth) {
  if (depth > MAX_DEPTH) return null;
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (entry.name.toLowerCase().includes(needle)) {
      return path.join(rootDir, entry.name);
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = findFile(path.join(rootDir, entry.name), needle, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

module.exports = {
  name: 'search_file',
  description: 'Sucht eine Datei anhand ihres (Teil-)Namens in den üblichen Nutzerordnern (Desktop, Dokumente, Downloads, Bilder, Videos, Musik) und öffnet den Explorer mit der gefundenen Datei markiert. Wenn der Nutzer sagt "such eine Datei" ohne Namen zu nennen, frage zuerst nach dem Dateinamen, bevor du dieses Tool aufrufst.',
  input_schema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Der gesuchte Datei- oder Teil-Dateiname.' },
    },
    required: ['filename'],
  },
  async run({ filename }, { permissions }) {
    if (!permissions.files) return { error: 'Berechtigung für Dateizugriff ist deaktiviert.' };

    const needle = filename.trim().toLowerCase();
    const home = os.homedir();

    for (const folder of SEARCH_ROOTS) {
      const root = path.join(home, folder);
      if (!fs.existsSync(root)) continue;
      const found = findFile(root, needle, 0);
      if (found) {
        shell.showItemInFolder(found);
        return { result: `Gefunden: ${found}` };
      }
    }

    return { error: `Keine Datei mit "${filename}" in Desktop, Dokumente, Downloads, Bilder, Videos oder Musik gefunden.` };
  },
};
