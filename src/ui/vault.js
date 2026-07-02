(function () {
  const pinSetupSection = document.getElementById('vaultPinSetupSection');
  const vaultNewPin = document.getElementById('vaultNewPin');
  const vaultSetPinBtn = document.getElementById('vaultSetPinBtn');
  const vaultPinErrorEl = document.getElementById('vaultPinError');

  const vaultLabel = document.getElementById('vaultLabel');
  const vaultUsername = document.getElementById('vaultUsername');
  const vaultPassword = document.getElementById('vaultPassword');
  const vaultAddPin = document.getElementById('vaultAddPin');
  const vaultAddBtn = document.getElementById('vaultAddBtn');
  const vaultAddErrorEl = document.getElementById('vaultAddError');

  const vaultEntryListEl = document.getElementById('vaultEntryList');

  async function refreshVaultUi() {
    const hasPin = await window.jarvis.vaultHasPin();
    pinSetupSection.style.display = hasPin ? 'none' : 'block';

    const entries = await window.jarvis.vaultList();
    vaultEntryListEl.innerHTML = entries.length
      ? entries.map((e) => `
        <div class="coord-row">
          <span>${e.label}</span>
          <span>${e.username || ''}</span>
          <button class="danger-btn" data-delete-id="${e.id}" style="padding:4px 10px; font-size:11px;">Löschen</button>
        </div>
      `).join('')
      : '<div style="font-size:12px; opacity:0.6;">Noch keine Einträge.</div>';

    vaultEntryListEl.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pin = prompt('Tresor-PIN zum Löschen eingeben:');
        if (!pin) return;
        const res = await window.jarvis.vaultDeleteEntry({ pin, id: btn.dataset.deleteId });
        if (res.ok) refreshVaultUi();
        else alert(res.error);
      });
    });
  }

  vaultSetPinBtn.addEventListener('click', async () => {
    vaultPinErrorEl.textContent = '';
    const res = await window.jarvis.vaultSetPin(vaultNewPin.value);
    if (res.ok) {
      vaultNewPin.value = '';
      refreshVaultUi();
    } else {
      vaultPinErrorEl.textContent = res.error;
    }
  });

  vaultAddBtn.addEventListener('click', async () => {
    vaultAddErrorEl.textContent = '';
    const res = await window.jarvis.vaultAddEntry({
      pin: vaultAddPin.value,
      label: vaultLabel.value.trim(),
      username: vaultUsername.value.trim(),
      password: vaultPassword.value,
    });
    if (res.ok) {
      vaultLabel.value = '';
      vaultUsername.value = '';
      vaultPassword.value = '';
      vaultAddPin.value = '';
      refreshVaultUi();
    } else {
      vaultAddErrorEl.textContent = res.error;
    }
  });

  window.addEventListener('jarvis:authenticated', refreshVaultUi);
})();
