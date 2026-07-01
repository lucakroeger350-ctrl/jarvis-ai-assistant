(function () {
  const overlay = document.getElementById('settingsOverlay');
  const openBtn = document.getElementById('settingsBtn');
  const closeBtn = document.getElementById('closeSettingsBtn');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const resetMemoryBtn = document.getElementById('resetMemoryBtn');

  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  const providerEl = document.getElementById('provider');
  const apiKeyEl = document.getElementById('apiKey');
  const apiKeyLabelEl = document.getElementById('apiKeyLabel');
  const apiKeyHintEl = document.getElementById('apiKeyHint');
  const modelEl = document.getElementById('model');

  const MODELS = {
    gemini: [
      { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (schnell, kostenlos)' },
      { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (stärker, kostenlos mit Limit)' },
    ],
    anthropic: [
      { value: 'claude-opus-4-8', label: 'claude-opus-4-8' },
      { value: 'claude-sonnet-5', label: 'claude-sonnet-5' },
      { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5' },
    ],
  };

  const HINTS = {
    gemini: 'Kostenlosen Key holen: aistudio.google.com → "Get API key" (Google-Konto reicht, keine Kreditkarte nötig).',
    anthropic: 'Kostenpflichtigen Key holen: console.anthropic.com → "API Keys" (Guthaben/Zahlungsmethode nötig).',
  };

  function updateProviderUI(provider, selectedModel) {
    const models = MODELS[provider] || MODELS.gemini;
    modelEl.innerHTML = models.map((m) => `<option value="${m.value}">${m.label}</option>`).join('');
    if (selectedModel && models.some((m) => m.value === selectedModel)) {
      modelEl.value = selectedModel;
    }
    apiKeyHintEl.textContent = HINTS[provider] || '';
    apiKeyLabelEl.firstChild.textContent = provider === 'anthropic' ? 'Anthropic API-Key' : 'Google Gemini API-Key';
  }

  providerEl.addEventListener('change', () => updateProviderUI(providerEl.value));
  const personalityEl = document.getElementById('personality');
  const userNameEl = document.getElementById('userName');
  const languageEl = document.getElementById('language');
  const voiceNameEl = document.getElementById('voiceName');
  const voiceRateEl = document.getElementById('voiceRate');
  const rateValEl = document.getElementById('rateVal');
  const voicePitchEl = document.getElementById('voicePitch');
  const pitchValEl = document.getElementById('pitchVal');
  const hotkeyEl = document.getElementById('hotkey');
  const autoStartEl = document.getElementById('autoStart');
  const autoLaunchAppsEl = document.getElementById('autoLaunchApps');
  const permScreenEl = document.getElementById('permScreen');
  const permAppsEl = document.getElementById('permApps');
  const permFilesEl = document.getElementById('permFiles');
  const factsListEl = document.getElementById('factsList');
  const learnedListEl = document.getElementById('learnedList');
  const themeSwatchesEl = document.getElementById('themeSwatches');
  let selectedTheme = 'orange';

  function applyTheme(theme) {
    selectedTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (window.hud) window.hud.setAccent(theme);
    themeSwatchesEl.querySelectorAll('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.theme === theme);
    });
  }

  themeSwatchesEl.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  function openSettings() {
    overlay.classList.add('open');
    loadKnowledge();
    if (window.jarvisProfiles) window.jarvisProfiles.renderProfilesTab();
  }
  function closeSettings() {
    overlay.classList.remove('open');
  }

  openBtn.addEventListener('click', openSettings);
  closeBtn.addEventListener('click', closeSettings);

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabPanels.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  voiceRateEl.addEventListener('input', () => {
    rateValEl.textContent = voiceRateEl.value;
  });
  voicePitchEl.addEventListener('input', () => {
    pitchValEl.textContent = voicePitchEl.value;
  });

  function populateVoices() {
    const voices = window.speechSynthesis.getVoices();
    voiceNameEl.innerHTML = '<option value="">Standard (automatisch männlich, falls verfügbar)</option>' +
      voices.map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
  }
  window.speechSynthesis.onvoiceschanged = populateVoices;
  populateVoices();

  async function loadSettings() {
    const s = await window.jarvis.getSettings();
    providerEl.value = s.provider || 'gemini';
    updateProviderUI(providerEl.value, s.model);
    apiKeyEl.value = s.apiKey || '';
    personalityEl.value = s.personality || '';
    userNameEl.value = s.userName || '';
    languageEl.value = s.language || 'de-DE';
    voiceRateEl.value = s.voiceRate || 1.0;
    rateValEl.textContent = s.voiceRate || 1.0;
    voicePitchEl.value = s.voicePitch != null ? s.voicePitch : 1.0;
    pitchValEl.textContent = s.voicePitch != null ? s.voicePitch : 1.0;
    hotkeyEl.value = s.hotkey || 'Alt+J';
    autoStartEl.checked = !!s.autoStart;
    autoLaunchAppsEl.value = s.autoLaunchApps || '';
    permScreenEl.checked = !!s.permissions?.screen;
    permAppsEl.checked = !!s.permissions?.apps;
    permFilesEl.checked = !!s.permissions?.files;
    setTimeout(() => { voiceNameEl.value = s.voiceName || ''; }, 300);

    applyTheme(s.accentTheme || 'orange');

    if (window.jarvisSpeech) window.jarvisSpeech.configure(s);
    return s;
  }

  async function saveSettings() {
    const settings = {
      provider: providerEl.value,
      apiKey: apiKeyEl.value.trim(),
      model: modelEl.value,
      personality: personalityEl.value,
      userName: userNameEl.value.trim(),
      language: languageEl.value,
      voiceName: voiceNameEl.value,
      voiceRate: parseFloat(voiceRateEl.value),
      voicePitch: parseFloat(voicePitchEl.value),
      hotkey: hotkeyEl.value.trim(),
      autoStart: autoStartEl.checked,
      autoLaunchApps: autoLaunchAppsEl.value.trim(),
      accentTheme: selectedTheme,
      permissions: {
        screen: permScreenEl.checked,
        apps: permAppsEl.checked,
        files: permFilesEl.checked,
      },
    };
    await window.jarvis.saveSettings(settings);
    if (window.jarvisSpeech) window.jarvisSpeech.configure(settings);
    if (window.dashboard) window.dashboard.refreshKpis();
    closeSettings();
  }

  saveBtn.addEventListener('click', saveSettings);

  async function loadKnowledge() {
    const mem = await window.jarvis.getMemory();
    factsListEl.innerHTML = mem.facts.length
      ? mem.facts.map((f) => `<div class="knowledge-item"><span>${f.text}</span><button data-id="${f.id}" class="del-fact">✕</button></div>`).join('')
      : '<div style="opacity:0.5">Noch nichts gemerkt.</div>';

    const learned = await window.jarvis.getLearnedSkills();
    learnedListEl.innerHTML = learned.skills.length
      ? learned.skills.map((s) => `<div class="knowledge-item"><span>"${s.trigger}" → ${s.action}</span><button data-id="${s.id}" class="del-skill">✕</button></div>`).join('')
      : '<div style="opacity:0.5">Noch nichts gelernt.</div>';

    document.querySelectorAll('.del-fact').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await window.jarvis.deleteMemoryItem(btn.dataset.id);
        loadKnowledge();
        if (window.dashboard) window.dashboard.refreshKpis();
      });
    });
    document.querySelectorAll('.del-skill').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await window.jarvis.deleteLearnedSkill(btn.dataset.id);
        loadKnowledge();
        if (window.dashboard) window.dashboard.refreshKpis();
      });
    });
  }

  resetMemoryBtn.addEventListener('click', async () => {
    await window.jarvis.clearMemory();
    loadKnowledge();
    if (window.dashboard) window.dashboard.refreshKpis();
  });

  window.jarvisSettings = { loadSettings };
})();
