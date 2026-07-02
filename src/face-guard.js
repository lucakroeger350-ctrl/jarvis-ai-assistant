(function () {
  let modelsLoaded = false;
  let armedStream = null;
  let armedInterval = null;

  async function ensureModelsLoaded() {
    if (modelsLoaded) return true;
    const res = await window.jarvis.ensureFaceModels();
    if (!res.ok) throw new Error(res.error);
    const modelUri = 'file://' + res.dir.replace(/\\/g, '/');
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUri);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUri);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelUri);
    modelsLoaded = true;
    return true;
  }

  async function detectDescriptor(videoEl) {
    await ensureModelsLoaded();
    const result = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!result) return null;
    return Array.from(result.descriptor);
  }

  // Wird aus src/ui/security.js für die Registrierung genutzt (eigener Video-Preview).
  window.faceGuard = { ensureModelsLoaded, detectDescriptor };

  // Automatischer Überwachungs-Loop: startet/stoppt sich selbst je nach "armed"-Status,
  // nutzt eine eigene, unsichtbare Videoquelle statt der Registrierungs-Vorschau.
  async function startArmedLoop() {
    if (armedInterval) return;
    try {
      await ensureModelsLoaded();
      armedStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      return; // keine Kamera verfügbar - Wächter kann nicht starten
    }
    const video = document.createElement('video');
    video.srcObject = armedStream;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    armedInterval = setInterval(async () => {
      try {
        const descriptor = await detectDescriptor(video);
        if (descriptor) await window.jarvis.checkFace(descriptor);
      } catch { /* einzelne Erkennung schlägt fehl - beim nächsten Tick erneut versuchen */ }
    }, 4000);
  }

  function stopArmedLoop() {
    if (armedInterval) { clearInterval(armedInterval); armedInterval = null; }
    if (armedStream) { armedStream.getTracks().forEach((t) => t.stop()); armedStream = null; }
  }

  window.jarvis.onSecurityArmedChanged((armed) => {
    if (armed) startArmedLoop();
    else stopArmedLoop();
  });
})();
