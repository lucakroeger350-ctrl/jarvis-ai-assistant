const calendar = require('../core/calendar');

module.exports = {
  name: 'add_appointment',
  description: 'Legt einen neuen Termin im Kalender an. Nutze dies, wenn der Nutzer einen Termin, Treffen oder eine Erinnerung eintragen möchte.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titel/Beschreibung des Termins.' },
      datetime: { type: 'string', description: 'Datum und Uhrzeit im ISO-Format, z.B. 2026-07-05T14:30:00.' },
      bufferMinutes: { type: 'number', description: 'Wie viele Minuten der Nutzer vorher losgehen/sich vorbereiten muss (Zeitpuffer), Standard 0.' },
    },
    required: ['title', 'datetime'],
  },
  async run({ title, datetime, bufferMinutes }) {
    const appt = calendar.addAppointment({ title, datetime, bufferMinutes });
    return { result: `Termin gespeichert: "${appt.title}" am ${new Date(appt.datetime).toLocaleString('de-DE')}${appt.bufferMinutes ? ` (Losgehen ${appt.bufferMinutes} Minuten vorher)` : ''}.` };
  },
};
