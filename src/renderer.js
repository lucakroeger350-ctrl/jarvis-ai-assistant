(function () {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const reactorLabel = document.getElementById('reactorLabel');
  const consoleLog = document.getElementById('consoleLog');
  const textForm = document.getElementById('textForm');
  const textInput = document.getElementById('textInput');
  const micBtn = document.getElementById('micBtn');

  let busy = false;
  let recording = false;

  const MODE_LABELS = {
    idle: 'STANDBY',
    listening: 'LISTENING',
    thinking: 'THINKING',
    speaking: 'SPEAKING',
  };

  const IDLE_LABEL = 'Mikrofon drücken zum Sprechen';

  function setStatus(state, label) {
    statusDot.className = 'status-dot ' + (state === 'idle' ? '' : state);
    statusText.textContent = label;
    reactorLabel.textContent = label;
    if (window.hud) window.hud.setState(state);
    if (window.dashboard) {
      window.dashboard.setMode(MODE_LABELS[state] || 'STANDBY');
      window.dashboard.setActivity(state === 'idle' ? 0.05 : 0.7);
    }
  }

  function logLine(who, text) {
    const div = document.createElement('div');
    div.className = 'log-line ' + who;
    const tagText = who === 'user' ? 'DU' : who === 'jarvis' ? 'JARVIS' : 'SYSTEM';
    div.innerHTML = `<span class="tag">${tagText}</span>${escapeHtml(text)}`;
    consoleLog.appendChild(div);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Textbasierte Eingabe (Tippen ODER Push-to-Talk-Ergebnis): geht über die Chat-Bridge, JARVIS spricht die Antwort selbst
  async function handleTypedMessage(message) {
    if (busy) return;
    busy = true;
    if (window.dashboard) window.dashboard.incrementCommands();
    logLine('user', message);
    setStatus('thinking', 'DENKE NACH...');

    try {
      const response = await window.jarvis.chat(message);
      logLine('jarvis', response.text);
      setStatus('speaking', 'ANTWORTE');
      window.jarvisSpeech.speak(response.text, () => {
        setStatus('idle', IDLE_LABEL);
        busy = false;
        if (window.dashboard) window.dashboard.refreshKpis();
      });
    } catch (err) {
      logLine('system', 'Fehler: ' + err.message);
      setStatus('idle', IDLE_LABEL);
      busy = false;
    }
  }

  textForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = textInput.value.trim();
    if (!val) return;
    textInput.value = '';
    handleTypedMessage(val);
  });

  // Push-to-Talk: Knopf drücken (ODER globale Tastenkombination), sprechen (Aufnahme stoppt
  // automatisch bei Stille), lokale KI-Transkription (Whisper), Text wird gesendet.
  async function triggerPushToTalk() {
    if (recording || busy) return;
    recording = true;
    micBtn.classList.add('recording');
    micBtn.disabled = true;
    textInput.placeholder = 'Ich höre zu... jetzt sprechen';
    setStatus('listening', 'HÖRE ZU...');

    try {
      const samples = await window.micRecorder.recordUntilSilence();
      if (!samples) {
        logLine('system', 'Nichts gehört. Bitte noch einmal versuchen.');
        setStatus('idle', IDLE_LABEL);
        return;
      }

      setStatus('thinking', 'TRANSKRIBIERE...');
      const result = await window.jarvis.transcribeAudio(samples);

      if (result.error) {
        logLine('system', 'Transkription fehlgeschlagen: ' + result.error);
        setStatus('idle', IDLE_LABEL);
        return;
      }
      if (result.text && result.text.trim()) {
        textInput.value = result.text.trim();
        handleTypedMessage(result.text.trim());
        textInput.value = '';
      } else {
        logLine('system', 'Nichts verstanden. Bitte noch einmal versuchen.');
        setStatus('idle', IDLE_LABEL);
      }
    } catch (err) {
      logLine('system', 'Mikrofon-Fehler: ' + err.message);
      setStatus('idle', IDLE_LABEL);
    } finally {
      recording = false;
      micBtn.classList.remove('recording');
      micBtn.disabled = false;
      textInput.placeholder = '...oder hier tippen und Enter drücken';
    }
  }

  micBtn.addEventListener('click', triggerPushToTalk);
  window.jarvis.onShortcutMic(() => triggerPushToTalk());

  window.jarvis.onGreeting((text) => {
    logLine('jarvis', text);
    setStatus('speaking', 'ANTWORTE');
    window.jarvisSpeech.speak(text, () => setStatus('idle', IDLE_LABEL));
  });

  window.jarvis.onAnnounce((text) => {
    if (busy) { logLine('jarvis', text); return; }
    logLine('jarvis', text);
    setStatus('speaking', 'ANTWORTE');
    window.jarvisSpeech.speak(text, () => setStatus('idle', IDLE_LABEL));
  });

  window.addEventListener('jarvis:meeting-log', (e) => logLine('system', e.detail));

  async function init() {
    const settings = await window.jarvisSettings.loadSettings();
    logLine('system', 'JARVIS-System initialisiert.');
    setStatus('idle', IDLE_LABEL);
    if (window.dashboard) window.dashboard.refreshKpis();
  }

  window.addEventListener('jarvis:authenticated', init);
})();
