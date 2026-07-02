(function () {
  const videoEl = document.getElementById('faceVideo');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const captureFaceBtn = document.getElementById('captureFaceBtn');
  const faceStatusEl = document.getElementById('faceStatus');
  const pinInput = document.getElementById('securityPin');
  const setPinBtn = document.getElementById('setPinBtn');
  const pinSetErrorEl = document.getElementById('pinSetError');
  const guardCheckbox = document.getElementById('cameraGuardEnabled');
  const guardStatusEl = document.getElementById('guardStatus');

  let previewStream = null;

  async function refreshStatus() {
    const status = await window.jarvis.getSecurityStatus();
    faceStatusEl.textContent = status.hasFace ? 'Gesicht registriert ✓' : 'Noch kein Gesicht registriert.';
    guardCheckbox.checked = status.enabled;
    guardCheckbox.disabled = !(status.hasFace && status.hasPin);
    guardStatusEl.textContent = status.hasFace && status.hasPin
      ? ''
      : 'Registriere zuerst ein Gesicht und lege eine PIN fest, um den Schutz zu aktivieren.';
  }

  startCameraBtn.addEventListener('click', async () => {
    try {
      previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoEl.srcObject = previewStream;
      faceStatusEl.textContent = 'Kamera aktiv - positioniere dein Gesicht und klicke "Gesicht erfassen".';
    } catch (err) {
      faceStatusEl.textContent = 'Kamera konnte nicht gestartet werden: ' + err.message;
    }
  });

  captureFaceBtn.addEventListener('click', async () => {
    if (!previewStream) { faceStatusEl.textContent = 'Bitte zuerst die Kamera starten.'; return; }
    faceStatusEl.textContent = 'Erfasse Gesicht...';
    try {
      const descriptor = await window.faceGuard.detectDescriptor(videoEl);
      if (!descriptor) { faceStatusEl.textContent = 'Kein Gesicht erkannt - bitte erneut versuchen.'; return; }
      await window.jarvis.saveFaceDescriptor(descriptor);
      previewStream.getTracks().forEach((t) => t.stop());
      previewStream = null;
      videoEl.srcObject = null;
      faceStatusEl.textContent = 'Gesicht erfolgreich registriert ✓';
      refreshStatus();
    } catch (err) {
      faceStatusEl.textContent = 'Fehler: ' + err.message;
    }
  });

  setPinBtn.addEventListener('click', async () => {
    pinSetErrorEl.textContent = '';
    const res = await window.jarvis.setSecurityPin(pinInput.value);
    if (res.ok) {
      pinInput.value = '';
      refreshStatus();
    } else {
      pinSetErrorEl.textContent = res.error;
    }
  });

  guardCheckbox.addEventListener('change', async () => {
    await window.jarvis.setSecurityArmed(guardCheckbox.checked);
  });

  window.addEventListener('jarvis:authenticated', refreshStatus);
})();
