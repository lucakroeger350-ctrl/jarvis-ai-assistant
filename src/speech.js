(function () {
  // Sprachausgabe (TTS): entweder über die Web Speech API (Windows-Systemstimmen) oder über
  // die lokale Piper-"Jarvis"-KI-Stimme (core/piper-tts.js). Spracherkennung (STT) läuft über
  // lokales Whisper - der Renderer nimmt per Push-to-Talk-Knopf das Mikrofon selbst auf
  // (src/mic-recorder.js) und schickt die Samples zur Transkription an den Hauptprozess.

  let language = 'de-DE';
  let voiceRate = 1.0;
  let voicePitch = 1.0;
  let voiceName = '';
  let voiceEngine = 'browser'; // 'browser' | 'piper'
  let speaking = false;
  let piperAudioEl = null;

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

  function speakBrowser(text, onDone) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = language;
    utter.rate = voiceRate;
    utter.pitch = voicePitch;
    const voice = pickVoice();
    if (voice) utter.voice = voice;

    utter.onend = () => { speaking = false; if (onDone) onDone(); };
    utter.onerror = () => { speaking = false; if (onDone) onDone(); };

    window.speechSynthesis.speak(utter);
  }

  async function speakPiper(text, onDone) {
    try {
      const result = await window.jarvis.speakPiper(text);
      if (result.error) {
        console.warn('Piper-TTS Fehler, falle zurück auf Systemstimme:', result.error);
        speakBrowser(text, onDone);
        return;
      }
      if (piperAudioEl) { piperAudioEl.pause(); piperAudioEl = null; }
      piperAudioEl = new Audio('data:audio/wav;base64,' + result.audio);
      piperAudioEl.playbackRate = voiceRate;
      piperAudioEl.onended = () => { speaking = false; if (onDone) onDone(); };
      piperAudioEl.onerror = () => { speaking = false; if (onDone) onDone(); };
      await piperAudioEl.play();
    } catch (err) {
      console.warn('Piper-TTS Fehler, falle zurück auf Systemstimme:', err.message);
      speakBrowser(text, onDone);
    }
  }

  function speak(text, onDone) {
    if (!text) { if (onDone) onDone(); return; }
    speaking = true;
    if (window.hud) window.hud.setState('speaking');

    if (voiceEngine === 'piper') speakPiper(text, onDone);
    else speakBrowser(text, onDone);
  }

  function stopSpeaking() {
    if (!speaking) return;
    window.speechSynthesis.cancel();
    if (piperAudioEl) { piperAudioEl.pause(); piperAudioEl = null; }
    speaking = false;
  }

  function configure(settings) {
    language = settings.language || 'de-DE';
    voiceRate = settings.voiceRate || 1.0;
    voicePitch = settings.voicePitch != null ? settings.voicePitch : 1.0;
    voiceName = settings.voiceName || '';
    voiceEngine = settings.voiceEngine || 'browser';
  }

  window.jarvisSpeech = {
    configure,
    speak,
    stopSpeaking,
    getVoices,
  };
})();
