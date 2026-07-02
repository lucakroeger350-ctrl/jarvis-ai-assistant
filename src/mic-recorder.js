(function () {
  const TARGET_SAMPLE_RATE = 16000; // Whisper erwartet 16kHz mono
  const SILENCE_THRESHOLD = 0.012; // RMS-Schwelle, ab der "Sprache" erkannt wird
  const SILENCE_STOP_MS = 1400; // so lange Stille nach Sprachbeginn beendet die Aufnahme (etwas großzügiger gegen abgeschnittene Sätze)
  const MAX_RECORDING_MS = 15000; // Sicherheitsnetz
  const MAX_WAIT_FOR_SPEECH_MS = 6000; // wenn gar nichts gesagt wird, trotzdem abbrechen

  // Mittelt jeweils einen Block von Samples statt nur jedes n-te herauszupicken
  // (simpler Anti-Aliasing-Tiefpass) - reines "nearest neighbor"-Downsampling erzeugt
  // sonst deutliche Aliasing-Artefakte, die Whisper öfter falsch verstehen lässt
  // (Mikrofone nehmen meist mit 44.1/48kHz auf, Whisper braucht 16kHz).
  function downsample(buffer, inputSampleRate) {
    if (inputSampleRate === TARGET_SAMPLE_RATE) return buffer;
    const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(buffer.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) { sum += buffer[j]; count++; }
      result[i] = count > 0 ? sum / count : buffer[start] || 0;
    }
    return result;
  }

  function rms(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    return Math.sqrt(sum / buffer.length);
  }

  function recordUntilSilence(onLevel) {
    return new Promise((resolve, reject) => {
      let audioContext, sourceNode, processorNode, mediaStream;
      const chunks = [];
      let speechStarted = false;
      let lastLoudTime = 0;
      const recordingStart = Date.now();
      let finished = false;

      function finish() {
        if (finished) return;
        finished = true;
        clearInterval(checkInterval);
        try {
          processorNode.disconnect();
          sourceNode.disconnect();
        } catch (e) { /* ignore */ }
        mediaStream.getTracks().forEach((t) => t.stop());
        const sampleRate = audioContext.sampleRate;
        audioContext.close();

        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const c of chunks) { merged.set(c, offset); offset += c.length; }

        if (!speechStarted || totalLength === 0) {
          resolve(null);
          return;
        }
        resolve(downsample(merged, sampleRate));
      }

      const checkInterval = setInterval(() => {
        const now = Date.now();
        if (!speechStarted && now - recordingStart > MAX_WAIT_FOR_SPEECH_MS) { finish(); return; }
        if (speechStarted && now - lastLoudTime > SILENCE_STOP_MS) { finish(); return; }
        if (now - recordingStart > MAX_RECORDING_MS) { finish(); return; }
      }, 150);

      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        mediaStream = stream;
        audioContext = new AudioContext();
        sourceNode = audioContext.createMediaStreamSource(stream);
        processorNode = audioContext.createScriptProcessor(4096, 1, 1);

        processorNode.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          const level = rms(input);
          if (onLevel) onLevel(level);
          if (level > SILENCE_THRESHOLD) {
            speechStarted = true;
            lastLoudTime = Date.now();
          }
          if (speechStarted) chunks.push(new Float32Array(input));
        };

        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);
      }).catch(reject);
    });
  }

  window.micRecorder = { recordUntilSilence };
})();
