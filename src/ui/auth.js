(function () {
  const authTabBtns = document.querySelectorAll('.auth-tab-btn');
  const authForms = document.querySelectorAll('.auth-form');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verifyForm = document.getElementById('verifyForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  const verifyError = document.getElementById('verifyError');
  const verifyEmailLabel = document.getElementById('verifyEmailLabel');
  const resendCodeBtn = document.getElementById('resendCodeBtn');

  const emailjsOverlay = document.getElementById('emailjsOverlay');
  const openEmailjsConfig = document.getElementById('openEmailjsConfig');
  const closeEmailjsConfig = document.getElementById('closeEmailjsConfig');
  const emailjsForm = document.getElementById('emailjsForm');

  let pendingRegistration = null; // { name, email, password, code }
  let emailjsConfig = { serviceId: '', templateId: '', publicKey: '' };

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

  async function loadEmailjsConfig() {
    const cfg = await window.jarvis.integrationsGet();
    emailjsConfig = cfg.emailjs;
    if (emailjsConfig.publicKey) {
      window.emailjs.init({ publicKey: emailjsConfig.publicKey });
    }
  }
  loadEmailjsConfig();

  openEmailjsConfig.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('emailjsServiceId').value = emailjsConfig.serviceId;
    document.getElementById('emailjsTemplateId').value = emailjsConfig.templateId;
    document.getElementById('emailjsPublicKey').value = emailjsConfig.publicKey;
    emailjsOverlay.classList.add('open');
  });
  closeEmailjsConfig.addEventListener('click', () => emailjsOverlay.classList.remove('open'));

  emailjsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
      emailjs: {
        serviceId: document.getElementById('emailjsServiceId').value.trim(),
        templateId: document.getElementById('emailjsTemplateId').value.trim(),
        publicKey: document.getElementById('emailjsPublicKey').value.trim(),
      },
    };
    await window.jarvis.integrationsSave(config);
    await loadEmailjsConfig();
    emailjsOverlay.classList.remove('open');
  });

  function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async function sendVerificationCode(email, code) {
    if (!emailjsConfig.serviceId || !emailjsConfig.templateId || !emailjsConfig.publicKey) {
      throw new Error('E-Mail-Versand ist noch nicht konfiguriert (Link unten: "E-Mail-Versand konfigurieren").');
    }
    await window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      to_email: email,
      code,
    });
  }

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
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    try {
      const code = generateCode();
      await sendVerificationCode(email, code);
      pendingRegistration = { name, email, password, code };
      verifyEmailLabel.textContent = email;
      verifyError.textContent = '';
      showForm('verify');
    } catch (err) {
      registerError.textContent = cleanError(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  resendCodeBtn.addEventListener('click', async () => {
    if (!pendingRegistration) return;
    verifyError.textContent = '';
    try {
      const code = generateCode();
      await sendVerificationCode(pendingRegistration.email, code);
      pendingRegistration.code = code;
      verifyError.textContent = 'Neuer Code gesendet.';
    } catch (err) {
      verifyError.textContent = cleanError(err);
    }
  });

  verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    verifyError.textContent = '';
    if (!pendingRegistration) return;

    const enteredCode = document.getElementById('verifyCode').value.trim();
    if (enteredCode !== pendingRegistration.code) {
      verifyError.textContent = 'Code ist falsch. Bitte erneut versuchen.';
      return;
    }

    try {
      const { name, email, password } = pendingRegistration;
      await window.jarvis.register(email, password, name);
      pendingRegistration = null;
      await unlockApp();
    } catch (err) {
      verifyError.textContent = cleanError(err);
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
