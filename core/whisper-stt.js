// Lokale, kostenlose KI-Spracherkennung via Whisper (transformers.js).
// Deutlich genauer als die alte Windows-SAPI-Engine. Modell wird beim ersten
// Gebrauch einmalig heruntergeladen und danach lokal zwischengespeichert.

let transcriberPromise = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      env.backends.onnx.logSeverityLevel = 3; // nur Fehler loggen, nicht jede Detail-Warnung
      // "small" statt "base": deutlich bessere Erkennungsgenauigkeit (v.a. für Deutsch),
      // nach wie vor komplett lokal/kostenlos, nur etwas größerer Download beim ersten Start.
      return pipeline('automatic-speech-recognition', 'Xenova/whisper-small');
    })();
  }
  return transcriberPromise;
}

async function transcribeSamples(float32Samples, language = 'german') {
  const transcriber = await getTranscriber();
  const result = await transcriber(float32Samples, { language, task: 'transcribe' });
  return (result.text || '').trim();
}

module.exports = { transcribeSamples };
