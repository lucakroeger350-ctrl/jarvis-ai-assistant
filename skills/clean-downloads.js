const fs = require('fs');
const path = require('path');
const os = require('os');

const CATEGORIES = {
  Bilder: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.heic'],
  Dokumente: ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.ppt', '.pptx', '.csv', '.rtf'],
  Videos: ['.mp4', '.mkv', '.mov', '.avi', '.webm', '.wmv'],
  Musik: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
  Archive: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  Programme: ['.exe', '.msi'],
};

function categoryFor(ext) {
  for (const [name, exts] of Object.entries(CATEGORIES)) {
    if (exts.includes(ext.toLowerCase())) return name;
  }
  return 'Sonstiges';
}

module.exports = {
  name: 'clean_downloads',
  description: 'Sortiert den Downloads-Ordner: verschiebt Dateien automatisch in Unterordner nach Typ (Bilder, Dokumente, Videos, Musik, Archive, Programme, Sonstiges). Nutze dies für "Downloads aufräumen".',
  input_schema: { type: 'object', properties: {} },
  async run(_input, { permissions }) {
    if (!permissions.files) return { error: 'Berechtigung für Dateizugriff ist deaktiviert.' };

    const downloadsDir = path.join(os.homedir(), 'Downloads');
    if (!fs.existsSync(downloadsDir)) return { error: 'Downloads-Ordner nicht gefunden.' };

    const entries = fs.readdirSync(downloadsDir, { withFileTypes: true });
    let moved = 0;
    const counts = {};

    for (const entry of entries) {
      if (entry.isDirectory()) continue;
      const ext = path.extname(entry.name);
      if (!ext) continue;
      const category = categoryFor(ext);
      const targetDir = path.join(downloadsDir, category);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const src = path.join(downloadsDir, entry.name);
      const dest = path.join(targetDir, entry.name);
      if (fs.existsSync(dest)) continue; // nicht überschreiben

      try {
        fs.renameSync(src, dest);
        moved += 1;
        counts[category] = (counts[category] || 0) + 1;
      } catch {
        // Datei evtl. gerade in Benutzung - überspringen
      }
    }

    if (moved === 0) return { result: 'Downloads-Ordner war bereits aufgeräumt, nichts zu verschieben.' };
    const summary = Object.entries(counts).map(([cat, n]) => `${n} nach ${cat}`).join(', ');
    return { result: `${moved} Dateien sortiert: ${summary}.` };
  },
};
