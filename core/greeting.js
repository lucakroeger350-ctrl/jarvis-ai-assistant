function greetingForHour(hour) {
  if (hour >= 5 && hour < 11) return 'Guten Morgen! Ich habe alles für dich vorbereitet.';
  if (hour >= 11 && hour < 17) return 'Guten Tag! Schön, dass du da bist.';
  if (hour >= 17 && hour < 22) return 'Guten Abend! Ich habe deine Programme bereits gestartet.';
  return 'Es ist spät - trotzdem herzlich willkommen zurück.';
}

function buildGreeting(userName) {
  const hour = new Date().getHours();
  const base = greetingForHour(hour);
  return userName ? `${base} ${userName}.` : base;
}

module.exports = { buildGreeting };
