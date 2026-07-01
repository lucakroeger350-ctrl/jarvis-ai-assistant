const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { app } = require('electron');

function meetingsDir() {
  const dir = path.join(app.getPath('documents'), 'JARVIS Meetings');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveMeetingSummaryPdf(summaryText) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(meetingsDir(), `Meeting-${timestamp}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text('JARVIS Meeting-Zusammenfassung', { underline: true });
  doc.moveDown();
  doc.fontSize(10).fillColor('gray').text(new Date().toLocaleString('de-DE'));
  doc.moveDown();
  doc.fontSize(12).fillColor('black').text(summaryText, { align: 'left' });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

module.exports = { saveMeetingSummaryPdf };
