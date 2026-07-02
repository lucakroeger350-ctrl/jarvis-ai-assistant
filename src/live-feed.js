(function () {
  const toggleBtn = document.getElementById('liveFeedToggleBtn');
  const videoEl = document.getElementById('liveFeedVideo');
  const feedLabelEl = document.getElementById('feedLabel');
  if (!toggleBtn) return;

  const CAPTIONS = ['LIVE-FEED AKTIV', 'ÜBERTRAGUNG STABIL', 'LOKAL, NICHTS WIRD GESPEICHERT'];
  let stream = null;
  let captionIndex = 0;
  let captionInterval = null;

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoEl.srcObject = stream;
      videoEl.style.display = 'block';
      toggleBtn.classList.add('active');
      captionIndex = 0;
      feedLabelEl.textContent = CAPTIONS[0];
      captionInterval = setInterval(() => {
        captionIndex = (captionIndex + 1) % CAPTIONS.length;
        feedLabelEl.textContent = CAPTIONS[captionIndex];
      }, 4000);
    } catch (err) {
      feedLabelEl.textContent = 'Kamera nicht verfügbar: ' + err.message;
    }
  }

  function stop() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    videoEl.style.display = 'none';
    videoEl.srcObject = null;
    toggleBtn.classList.remove('active');
    if (captionInterval) { clearInterval(captionInterval); captionInterval = null; }
    feedLabelEl.textContent = 'Standby — sag "was siehst du?"';
  }

  toggleBtn.addEventListener('click', () => {
    if (stream) stop();
    else start();
  });
})();
