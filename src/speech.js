(function () {
  // Sprachausgabe (TTS) läuft im Renderer über die Web Speech API (funktioniert lokal in Electron).
  // Spracherkennung (STT) läuft nativ über Windows Speech Recognition im Hauptprozess (core/native-speech.js)
  // und wird ausschließlich per Push-to-Talk-Knopf für einen einzelnen Satz gestartet (kein Dauerzuhören,
  // damit die Oberfläche nicht dauerhaft blockiert oder Ressourcen verbraucht).

  let language = 'de-DE';
  let voiceRate = 1.0;
  let voicePitch = 1.0;
  let voiceName = '';
  let speaking = false;
  let onPartial = null;

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

  // Live-Zwischenergebnisse während einer Push-to-Talk-Aufnahme
  window.jarvis.onSpeechPartial((text) => { if (onPartial) onPartial(text); });

  window.jarvisSpeech = {
    configure,
    speak,
    stopSpeaking,
    getVoices,
    set onPartial(fn) { onPartial = fn; },
  };
})();
