const { exec } = require('child_process');

module.exports = {
  name: 'cancel_shutdown',
  description: 'Bricht ein zuvor gestartetes Herunterfahren des PCs ab.',
  input_schema: { type: 'object', properties: {} },
  async run() {
    return new Promise((resolve) => {
      exec('shutdown /a', (err) => {
        if (err) resolve({ result: 'Es war gerade kein Herunterfahren geplant.' });
        else resolve({ result: 'Herunterfahren wurde abgebrochen.' });
      });
    });
  },
};
