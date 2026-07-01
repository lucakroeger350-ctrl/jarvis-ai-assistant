const { desktopCapturer, screen } = require('electron');

async function captureScreenshot() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width, height },
  });

  const source = sources[0];
  if (!source) throw new Error('Kein Bildschirm zum Aufnehmen gefunden.');

  const image = source.thumbnail;
  const buffer = image.toJPEG(80);
  return buffer.toString('base64');
}

module.exports = { captureScreenshot };
