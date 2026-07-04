// Zentrale DLC-Registry: für jedes neue DLC hier einen Eintrag hinzufügen (Supabase-
// Spaltenname -> Lademodul im dlc/-Ordner). Kein anderer Code muss dafür angefasst werden.
const DLC_MODULES = {
  has_dlc_hud_customizer: '../dlc/hud-customizer',
};

const ownedFlags = new Set();
let sendFn = null;

function init(send) {
  sendFn = send;
}

// Wird von core/credit-gate.js aufgerufen, sobald sich die Profil-Zeile ändert (Login
// oder Realtime-Update) - lädt neu freigeschaltete DLC-Module dynamisch nach.
function applyProfileFlags(row) {
  for (const [column, modulePath] of Object.entries(DLC_MODULES)) {
    const owned = !!row[column];
    if (owned && !ownedFlags.has(column)) {
      ownedFlags.add(column);
      try {
        require(modulePath).init(sendFn || (() => {}));
      } catch (err) {
        console.warn(`DLC-Modul ${modulePath} konnte nicht geladen werden:`, err.message);
      }
    } else if (!owned) {
      ownedFlags.delete(column);
    }
  }
}

function hasDlc(column) {
  return ownedFlags.has(column);
}

module.exports = { init, applyProfileFlags, hasDlc };
