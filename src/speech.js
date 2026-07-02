(function () {
  // Sprachausgabe (TTS) läuft im Renderer über die Web Speech API (funktioniert lokal in Electron).
  // Spracherkennung (STT) läuft über lokales Whisper (core/whisper-stt.js) - der Renderer nimmt
  // per Push-to-Talk-Knopf das Mikrofon selbst auf (src/mic-recorder.js) und schickt die Samples
  // zur Transkription an den Hauptprozess.

  let language = 'de-DE';
  let voiceRate = 1.0;
  let voicePitch = 1.0;
  let voiceName = '';
  let speaking = false;

  const MALE_VOICE_HINTS = ['stefan', 'david', 'mark', 'conrad', 'ralf', 'george'];

  function getVoices() {
    return window.speechSynthesis.getVoices();
  }

  function pickVoice() {
    const voices = getVoices();
    if (voiceName) {
      const lower = voiceName.toLowerCase();
      const exact = voices.find((v) => v.name === voiceName);
      if (exact) return exact;
      const partial = voices.find((v) => v.name.toLowerCase().includes(lower));
      if (partial) return partial;
    }
    const maleMatch = voices.find((v) => v.lang === language && MALE_VOICE_HINTS.some((h) => v.name.toLowerCase().includes(h)));
    if (maleMatch) return maleMatch;
    const localMatch = voices.find((v) => v.lang === language && v.localService);
    if (localMatch) return localMatch;
    return voices.find((v) => v.lang === language) || voices.find((v) => v.localService) || voices[0];
  }

  function speak(text, onDone) {
    if (!text) { if (onDone) onDone(); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = voiceRate;
    utter.pitch = voicePitch;
    const voice = pickVoice();
    if (voice) utter.voice = voice;

    speaking = true;
    if (window.hud) window.hud.setState('speaking');

    utter.onend = () => {
      speaking = false;
      if (onDone) onDone();
    };
    utter.onerror = () => {
      speaking = false;
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if (speaking) {
      window.speechSynthesis.cancel();
      speaking = false;
    }
  }

  function configure(settings) {
    language = settings.language || 'de-DE';
    voiceRate = settings.voiceRate || 1.0;
    voicePitch = settings.voicePitch != null ? settings.voicePitch : 1.0;
    voiceName = settings.voiceName || '';
  }

  window.jarvisSpeech = {
    configure,
    speak,
    stopSpeaking,
    getVoices,
  };
})();
