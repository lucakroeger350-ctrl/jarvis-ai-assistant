(function () {
  // Musik-Visualizer: greift das Windows-Systemaudio per Loopback ab (gleicher Mechanismus
  // wie die Meeting-Aufnahme) und liefert Echtzeit-Frequenzdaten für das Oszilloskop-Widget.

  let audioContext = null;
  let analyser = null;
  let sourceNode = null;
  let mediaStream = null;
  let active = false;
  let dataArray = null;

  async function start() {
    if (active) return;
    try {
      mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = mediaStream.getAudioTracks();
      if (!audioTracks.length) throw new Error('Kein Systemaudio verfügbar.');

      audioContext = new AudioContext();
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      sourceNode.connect(analyser);
      active = true;
      window.dispatchEvent(new CustomEvent('jarvis:visualizer-log', { detail: 'Musik-Visualizer aktiv.' }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('jarvis:visualizer-log', { detail: 'Visualizer-Fehler: ' + err.message }));
    }
  }

  function stop() {
    if (!active) return;
    active = false;
    try {
      mediaStream.getTracks().forEach((t) => t.stop());
      audioContext.close();
    } catch (e) { /* ignore */ }
    window.dispatchEvent(new CustomEvent('jarvis:visualizer-log', { detail: 'Musik-Visualizer gestoppt.' }));
  }

  function getLevels() {
    if (!active || !analyser) return null;
    analyser.getByteFrequencyData(dataArray);
    const bassEnd = Math.floor(dataArray.length * 0.3);
    let bass = 0;
    for (let i = 0; i < bassEnd; i++) bass += dataArray[i];
    bass = bass / bassEnd / 255;

    let treble = 0;
    for (let i = bassEnd; i < dataArray.length; i++) treble += dataArray[i];
    treble = treble / (dataArray.length - bassEnd) / 255;

    return { bass, treble };
  }

  function isActive() { return active; }

  window.musicVisualizer = { start, stop, getLevels, isActive };
})();
