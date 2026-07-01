const meeting = require('../core/meeting');

module.exports = {
  name: 'start_meeting_recording',
  description: 'Startet die Aufnahme des Desktop-/System-Audios (z.B. für ein laufendes Meeting), damit später eine Zusammenfassung erstellt werden kann. Nutze dies, wenn der Nutzer sagt "starte die Meeting-Aufnahme" o.ä.',
  input_schema: { type: 'object', properties: {} },
  async run() {
    const res = meeting.requestStart();
    if (res.alreadyRecording) return { result: 'Es läuft bereits eine Aufnahme.' };
    return { result: 'Aufnahme gestartet. Sag mir einfach "fasse das Meeting zusammen", wenn es vorbei ist.' };
  },
};
