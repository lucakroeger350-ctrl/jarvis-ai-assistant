(function () {
  const accountInfoEl = document.getElementById('accountInfo');
  const logoutBtn = document.getElementById('logoutBtn');
  const appVersionEl = document.getElementById('appVersion');
  const updateStatusEl = document.getElementById('updateStatus');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');
  const installUpdateBtn = document.getElementById('installUpdateBtn');

  async function renderProfilesTab() {
    const session = await window.jarvis.getSession();
    accountInfoEl.textContent = session ? `${session.displayName} (${session.email})` : 'Nicht angemeldet';
    appVersionEl.textContent = await window.jarvis.getAppVersion();
  }

  logoutBtn.addEventListener('click', async () => {
    await window.jarvis.logout();
    location.reload();
  });

  checkUpdateBtn.addEventListener('click', async () => {
    updateStatusEl.textContent = 'Suche nach Updates...';
    const res = await window.jarvis.checkForUpdates();
    if (res && res.error) updateStatusEl.textContent = res.error;
  });

  downloadUpdateBtn.addEventListener('click', async () => {
    downloadUpdateBtn.disabled = true;
    updateStatusEl.textContent = 'Lädt herunter... 0%';
    await window.jarvis.downloadUpdate();
  });

  installUpdateBtn.addEventListener('click', () => {
    window.jarvis.installUpdate();
  });

  window.jarvis.onUpdateAvailable((info) => {
    updateStatusEl.textContent = `Update verfügbar: Version ${info.version}`;
    downloadUpdateBtn.style.display = 'block';
  });

  window.jarvis.onUpdateStatus((status) => {
    if (status.status === 'up-to-date') updateStatusEl.textContent = 'Du hast bereits die neueste Version.';
    else if (status.status === 'error') updateStatusEl.textContent = 'Fehler: ' + status.message;
  });

  window.jarvis.onUpdateProgress((p) => {
    updateStatusEl.textContent = `Lädt herunter... ${p.percent}%`;
  });

  window.jarvis.onUpdateReady(() => {
    updateStatusEl.textContent = 'Update heruntergeladen und bereit.';
    downloadUpdateBtn.style.display = 'none';
    installUpdateBtn.style.display = 'block';
  });

  window.jarvisProfiles = { renderProfilesTab };
})();
