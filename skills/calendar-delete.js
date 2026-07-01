const calendar = require('../core/calendar');

module.exports = {
  name: 'delete_appointment',
  description: 'Löscht einen Termin. Rufe zuerst list_appointments auf, um die genaue Bezeichnung/den Titel zu kennen, falls unklar.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Titel des zu löschenden Termins (exakter oder ähnlicher Text).' },
    },
    required: ['title'],
  },
  async run({ title }) {
    const list = calendar.listAppointments();
    const match = list.find((a) => a.title.toLowerCase().includes(title.toLowerCase()));
    if (!match) return { error: `Kein Termin mit "${title}" gefunden.` };
    calendar.deleteAppointment(match.id);
    return { result: `Termin "${match.title}" wurde gelöscht.` };
  },
};
