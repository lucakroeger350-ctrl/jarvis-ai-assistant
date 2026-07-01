const { captureScreenshot } = require('../core/vision');

module.exports = {
  name: 'look_at_screen',
  description: 'Macht einen Screenshot des Bildschirms, damit du sehen kannst, was der Nutzer gerade macht. Nutze dies, wenn der Nutzer fragt "was siehst du?", "schau dir meinen Bildschirm an" o.ä.',
  input_schema: {
    type: 'object',
    properties: {},
  },
  async run(_input, { permissions }) {
    if (!permissions.screen) return { error: 'Berechtigung zum Ansehen des Bildschirms ist deaktiviert.' };
    const base64 = await captureScreenshot();
    return { image: base64 };
  },
};
