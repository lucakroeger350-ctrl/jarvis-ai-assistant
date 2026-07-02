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
})();
