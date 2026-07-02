(function () {
  const vipStatusEl = document.getElementById('vipStatus');
  const vipCodeEl = document.getElementById('vipCode');
  const vipCodeErrorEl = document.getElementById('vipCodeError');
  const activateBtn = document.getElementById('activateVipBtn');
  const adSlot = document.getElementById('adSlot');

  const TIER_LABELS = { guest: 'Gast', free: 'Kostenlos', vip: 'VIP' };

  async function refreshAccountUi() {
    const state = await window.jarvis.getAccountState();

    if (adSlot) adSlot.classList.toggle('hidden', state.tier === 'vip');

    if (vipStatusEl) {
      const limit = state.messageLimit === Infinity ? 'unbegrenzt' : `${state.messageCount} / ${state.messageLimit}`;
      const coinsLine = state.tier === 'free' ? `<br/>Coins: ${state.coins}` : '';
      vipStatusEl.innerHTML = `Stufe: <strong>${TIER_LABELS[state.tier] || state.tier}</strong><br/>Fragen genutzt: ${limit}${coinsLine}`;
    }
    return state;
  }

  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      vipCodeErrorEl.textContent = '';
      const code = vipCodeEl.value.trim();
      const res = await window.jarvis.activateVip(code);
      if (res.ok) {
        vipCodeEl.value = '';
        await refreshAccountUi();
      } else {
        vipCodeErrorEl.textContent = res.error;
      }
    });
  }

  window.jarvisAccount = { refresh: refreshAccountUi };
  window.addEventListener('jarvis:authenticated', refreshAccountUi);

  // ---- Spotify-Anbindung ----
  const spotifyClientIdEl = document.getElementById('spotifyClientId');
  const spotifyHintEl = document.getElementById('spotifyHint');
  const spotifyStatusEl = document.getElementById('spotifyStatus');
  const saveSpotifyIdBtn = document.getElementById('saveSpotifyIdBtn');
  const connectSpotifyBtn = document.getElementById('connectSpotifyBtn');

  const SPOTIFY_HINTS = {
    'de-DE': 'So bekommst du eine Client-ID: Gehe zu developer.spotify.com/dashboard, klicke "Create app", trage bei Redirect-URI genau "http://127.0.0.1:43682/callback" ein, speichere - die Client-ID steht danach auf der App-Seite. Kein Client-Secret nötig.',
    'en-US': 'How to get a Client ID: Go to developer.spotify.com/dashboard, click "Create app", set the Redirect URI to exactly "http://127.0.0.1:43682/callback", save - the Client ID is then shown on the app page. No client secret needed.',
  };

  async function refreshSpotifyUi() {
    const settings = await window.jarvis.getSettings();
    spotifyHintEl.textContent = SPOTIFY_HINTS[settings.language] || SPOTIFY_HINTS['de-DE'];

    const integrations = await window.jarvis.integrationsGet();
    spotifyClientIdEl.value = integrations.spotify.clientId || '';

    const connected = await window.jarvis.spotifyIsConnected();
    spotifyStatusEl.textContent = connected ? 'Verbunden ✓' : 'Nicht verbunden.';
  }

  if (saveSpotifyIdBtn) {
    saveSpotifyIdBtn.addEventListener('click', async () => {
      const integrations = await window.jarvis.integrationsGet();
      await window.jarvis.integrationsSave({ ...integrations, spotify: { clientId: spotifyClientIdEl.value.trim() } });
      spotifyStatusEl.textContent = 'Client-ID gespeichert.';
    });
  }

  if (connectSpotifyBtn) {
    connectSpotifyBtn.addEventListener('click', async () => {
      spotifyStatusEl.textContent = 'Öffne Spotify-Anmeldung im Browser...';
      const res = await window.jarvis.spotifyConnect();
      spotifyStatusEl.textContent = res.ok ? 'Verbunden ✓' : 'Fehler: ' + res.error;
    });
  }

  window.addEventListener('jarvis:authenticated', refreshSpotifyUi);
})();
