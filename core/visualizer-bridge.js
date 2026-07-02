let sendFn = null;
let active = false;

function init(send) {
  sendFn = send;
}

function toggle() {
  active = !active;
  if (sendFn) sendFn('visualizer:toggle', { active });
  return active;
}

function isActive() {
  return active;
}

function send(channel, payload) {
  if (sendFn) sendFn(channel, payload);
}

module.exports = { init, toggle, isActive, send };
