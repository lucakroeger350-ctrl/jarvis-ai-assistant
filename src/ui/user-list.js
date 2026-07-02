(function () {
  const userListEl = document.getElementById('userList');
  if (!userListEl) return;

  // Da JARVIS eine lokale Ein-Profil-App ist (keine gleichzeitigen Mehrfach-Sitzungen),
  // zeigt "online" hier das aktuell aktive lokale Profil auf diesem Gerät, nicht eine
  // echte Mehrbenutzer-Serverpräsenz.
  async function refreshUserList() {
    const [profiles, activeId] = await Promise.all([
      window.jarvis.listProfiles(),
      window.jarvis.getActiveProfile(),
    ]);

    userListEl.innerHTML = profiles.map((p) => {
      const isActive = p.id === activeId;
      return `
        <div class="user-row">
          <span class="user-dot ${isActive ? 'online' : 'offline'}"></span>
          <span class="user-name">${p.name}</span>
          <span class="user-status">${isActive ? 'AKTIV' : 'INAKTIV'}</span>
        </div>
      `;
    }).join('') || '<div style="font-size:11px; opacity:0.6;">Keine Profile.</div>';
  }

  window.addEventListener('jarvis:authenticated', refreshUserList);
})();
