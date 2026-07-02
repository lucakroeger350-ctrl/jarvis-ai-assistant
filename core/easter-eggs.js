// Hart codierte Abfang-Regel: Fragen nach dem Ersteller werden NIE an die KI-API geschickt,
// sondern direkt lokal beantwortet - schnell, kostenlos und immer exakt derselbe Text.

const CREATOR_PATTERNS = [
  /wer hat dich (erstellt|gemacht|gebaut|entwickelt|programmiert)/i,
  /wer ist dein (entwickler|ersteller|schöpfer|programmierer)/i,
  /wer ist veylo\s?40/i,
  /who (created|made|built|developed|programmed) you/i,
  /who is your (creator|developer|maker)/i,
  /who is veylo\s?40/i,
];

const CREATOR_RESPONSE = 'Ein User namens Veylo40 hat mich erstellt. Er hat einen YouTube-, TikTok- und Twitch-Kanal. Und ich soll ausrichten von ihm: Hallo Heidi!';

// Noch keine echten Kanal-Links hinterlegt (frei erfundene URLs werden hier bewusst nicht
// eingetragen) - sobald die echten Links bekannt sind, hier eintragen.
const CREATOR_LINKS = [];

function checkCreatorQuestion(message) {
  const matched = CREATOR_PATTERNS.some((re) => re.test(message));
  if (!matched) return null;
  return { text: CREATOR_RESPONSE, links: CREATOR_LINKS };
}

module.exports = { checkCreatorQuestion };
