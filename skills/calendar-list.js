const calendar = require('../core/calendar');

module.exports = {
  name: 'list_appointments',
  description: 'Liest die bevorstehenden Termine aus dem Kalender vor. Nutze dies, wenn der Nutzer fragt "was steht an", "welche Termine habe ich" o.ä.',
  input_schema: {
    type: 'object',
    properties: {},
  },
  async run() {
    const list = calendar.listAppointments({ upcomingOnly: true });
    if (!list.length) return { result: 'Es stehen keine bevorstehenden Termine an.' };
    return {
      result: list.map((a) => `${a.title} am ${new Date(a.datetime).toLocaleString('de-DE')}`).join('; '),
    };
  },
};
