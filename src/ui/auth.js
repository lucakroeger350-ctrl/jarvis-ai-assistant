(function () {
  const authTabBtns = document.querySelectorAll('.auth-tab-btn');
  const authForms = document.querySelectorAll('.auth-form');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');

  function showForm(name) {
    authForms.forEach((f) => f.classList.remove('active'));
    document.getElementById(name + 'Form').classList.add('active');
  }

  authTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      authTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      showForm(btn.dataset.authTab);
    });
  });

  async function unlockApp() {
    document.body.classList.remove('pre-auth');
    await window.jarvis.sessionReady();
    window.dispatchEvent(new CustomEvent('jarvis:authenticated'));
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
      await window.jarvis.login(email, password);
      await unlockApp();
    } catch (err) {
      loginError.textContent = cleanError(err);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
      await window.jarvis.register(email, password, name);
      await unlockApp();
    } catch (err) {
      registerError.textContent = cleanError(err);
    }
  });

  function cleanError(err) {
    return (err && err.message ? err.message : String(err))
      .replace(/^Error invoking remote method[^:]*:\s*/, '')
      .replace(/^Error:\s*/, '');
  }

  (async function checkSession() {
    const session = await window.jarvis.getSession();
    if (session) {
      await unlockApp();
    }
  })();
})();
