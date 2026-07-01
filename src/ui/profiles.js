(function () {
  const accountInfoEl = document.getElementById('accountInfo');
  const logoutBtn = document.getElementById('logoutBtn');

  async function renderProfilesTab() {
    const session = await window.jarvis.getSession();
    accountInfoEl.textContent = session ? `${session.displayName} (${session.email})` : 'Nicht angemeldet';
  }

  logoutBtn.addEventListener('click', async () => {
    await window.jarvis.logout();
    location.reload();
  });

  window.jarvisProfiles = { renderProfilesTab };
})();
