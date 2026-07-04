// main.js besitzt enterGamingOverlay()/exitGamingOverlay() (Fensterverwaltung); diese
// kleine Bridge erlaubt Skills (gleicher Prozess, aber ohne main.js zu importieren),
// Gaming Mode manuell per Sprachbefehl auszulösen - analog zu core/vault-bridge.js.
let enterFn = null;
let exitFn = null;

function init(enter, exit) {
  enterFn = enter;
  exitFn = exit;
}

function enter() {
  if (enterFn) enterFn();
}

function exit() {
  if (exitFn) exitFn();
}

module.exports = { init, enter, exit };
