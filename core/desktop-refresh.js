const { exec } = require('child_process');

// Nach dem Schließen von Vollbild-/Overlay-Fenstern (Sperrbildschirm, Projektion) kann
// der Windows Desktop Window Manager (DWM) beim anschließenden Markieren von Icons einen
// "eingebrannten" schwarzen Bereich zeigen, bis irgendein Ereignis einen Neu-Repaint auslöst.
// UpdatePerUserSystemParameters zwingt Explorer, den Desktop sofort komplett neu zu zeichnen -
// der Standard-Trick gegen genau dieses Windows/DWM-Repaint-Problem.
function refreshDesktop() {
  exec('RUNDLL32.EXE user32.dll,UpdatePerUserSystemParameters', () => {});
}

module.exports = { refreshDesktop };
