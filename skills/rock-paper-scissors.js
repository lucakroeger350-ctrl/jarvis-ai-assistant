const OPTIONS = ['schere', 'stein', 'papier'];

function beats(a, b) {
  return (a === 'schere' && b === 'papier') ||
    (a === 'stein' && b === 'schere') ||
    (a === 'papier' && b === 'stein');
}

module.exports = {
  name: 'rock_paper_scissors',
  description: 'Spielt eine Runde Schere-Stein-Papier gegen den Nutzer. Nutze dies für "Schere, Stein, Papier".',
  input_schema: {
    type: 'object',
    properties: {
      choice: { type: 'string', description: 'Die Wahl des Nutzers: "schere", "stein" oder "papier".' },
    },
    required: ['choice'],
  },
  async run({ choice }) {
    const userChoice = choice.trim().toLowerCase();
    if (!OPTIONS.includes(userChoice)) {
      return { error: 'Bitte "Schere", "Stein" oder "Papier" wählen.' };
    }

    const jarvisChoice = OPTIONS[Math.floor(Math.random() * OPTIONS.length)];

    let outcome;
    if (userChoice === jarvisChoice) outcome = 'Unentschieden';
    else if (beats(jarvisChoice, userChoice)) outcome = 'JARVIS gewinnt';
    else outcome = 'Nutzer gewinnt';

    let resultText;
    if (outcome === 'Unentschieden') resultText = `Unentschieden! Ich habe auch ${jarvisChoice} gewählt.`;
    else if (outcome === 'JARVIS gewinnt') resultText = `Ich habe ${jarvisChoice} gewählt. Künstliche Intelligenz gewinnt wieder.`;
    else resultText = `Ich habe ${jarvisChoice} gewählt. Gut gespielt, Sir - diese Runde geht an Sie.`;

    return { result: resultText };
  },
};
