const { EventEmitter } = require('events');

const bridge = new EventEmitter();
let recordingActive = false;
let pendingStopResolve = null;

function init(sendFn) {
  bridge.send = sendFn;
}

function requestStart() {
  if (recordingActive) return { alreadyRecording: true };
  recordingActive = true;
  bridge.send('meeting:start', {});
  return { started: true };
}

function requestStop() {
  return new Promise((resolve) => {
    if (!recordingActive) { resolve(null); return; }
    pendingStopResolve = resolve;
    bridge.send('meeting:stop', {});

    // Sicherheitsnetz: falls der Renderer nicht antwortet, nach 20s abbrechen
    setTimeout(() => {
      if (pendingStopResolve === resolve) {
        pendingStopResolve = null;
        recordingActive = false;
        resolve(null);
      }
    }, 20000);
  });
}

function receiveAudioFile(wavPath) {
  recordingActive = false;
  if (pendingStopResolve) {
    const resolve = pendingStopResolve;
    pendingStopResolve = null;
    resolve(wavPath);
  }
}

function isRecording() {
  return recordingActive;
}

module.exports = { init, requestStart, requestStop, receiveAudioFile, isRecording };
