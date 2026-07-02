const fs = require('fs');
const path = require('path');
const os = require('os');
const { shell } = require('electron');
const { captureScreenshot } = require('../core/vision');

module.exports = {
  name: 'take_screenshot',
  description: 'Macht einen Screenshot des Bildschirms und speichert ihn lokal ab (ohne KI-Analyse). Nutze dies für "Foto machen", "Screenshot", "mach ein Bildschirmfoto".',
  input_schema: { type: 'object', properties: {} },
  async run(_input, { permissions }) {
    if (!permissions.screen) return { error: 'Berechtigung zum Ansehen des Bildschirms ist deaktiviert.' };

    const base64 = await captureScreenshot();
    const mediaDir = path.join(os.homedir(), 'Jarvis_Media');
    if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });

    const filePath = path.join(mediaDir, `screenshot-${Date.now()}.jpg`);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    shell.showItemInFolder(filePath);

    return { result: `Screenshot gespeichert unter ${filePath}.` };
  },
};
