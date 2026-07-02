// main.js besitzt das Vault-PIN-Popup-Fenster; dieses kleine Bridge-Modul erlaubt
// Skills (die im selben Prozess, aber ohne main.js zu importieren, laufen), es zu öffnen.
let openFn = null;

function init(fn) {
  openFn = fn;
}

function open(entry) {
  if (openFn) openFn(entry);
}

module.exports = { init, open };
