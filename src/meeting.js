(function () {
  const TARGET_SAMPLE_RATE = 16000; // System.Speech kommt mit 16kHz PCM gut zurecht

  let audioContext = null;
  let sourceNode = null;
  let processorNode = null;
  let mediaStream = null;
  let recordedChunks = []; // Float32Array[] bei Original-Samplerate
  let recording = false;

  function downsampleTo16k(buffer, inputSampleRate) {
    if (inputSampleRate === TARGET_SAMPLE_RATE) return buffer;
    const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * ratio)];
    }
    return result;
  }

  function floatTo16BitPCM(samples) {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  function encodeWav(samples, sampleRate) {
    const pcmBuffer = floatTo16BitPCM(samples);
    const headerSize = 44;
    const buffer = new ArrayBuffer(headerSize + pcmBuffer.byteLength);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmBuffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmBuffer.byteLength, true);

    new Uint8Array(buffer, headerSize).set(new Uint8Array(pcmBuffer));
    return buffer;
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function startRecording() {
    if (recording) return;
    recordedChunks = [];

    mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    const audioTracks = mediaStream.getAudioTracks();
    if (!audioTracks.length) throw new Error('Kein Systemaudio verfügbar für die Aufnahme.');

    audioContext = new AudioContext();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);

    processorNode.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      recordedChunks.push(new Float32Array(input));
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);
    recording = true;
  }

  async function stopRecordingAndSend() {
    if (!recording) return;
    recording = false;

    processorNode.disconnect();
    sourceNode.disconnect();
    mediaStream.getTracks().forEach((t) => t.stop());
    const sampleRate = audioContext.sampleRate;
    await audioContext.close();

    const totalLength = recordedChunks.reduce((sum, c) => sum + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of recordedChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    recordedChunks = [];

    const resampled = downsampleTo16k(merged, sampleRate);
    const wavBuffer = encodeWav(resampled, TARGET_SAMPLE_RATE);
    const base64 = arrayBufferToBase64(wavBuffer);
    await window.jarvis.submitMeetingAudio(base64);
  }

  window.jarvis.onMeetingStart(async () => {
    try {
      await startRecording();
      window.dispatchEvent(new CustomEvent('jarvis:meeting-log', { detail: 'Meeting-Aufnahme gestartet.' }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('jarvis:meeting-log', { detail: 'Aufnahme fehlgeschlagen: ' + err.message }));
    }
  });

  window.jarvis.onMeetingStop(async () => {
    try {
      await stopRecordingAndSend();
      window.dispatchEvent(new CustomEvent('jarvis:meeting-log', { detail: 'Aufnahme beendet, wird transkribiert...' }));
    } catch (err) {
      window.dispatchEvent(new CustomEvent('jarvis:meeting-log', { detail: 'Fehler beim Beenden: ' + err.message }));
    }
  });
})();
