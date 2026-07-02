(function () {
  const kpiFactsEl = document.getElementById('kpiFacts');
  const kpiSkillsEl = document.getElementById('kpiSkills');
  const kpiCommandsEl = document.getElementById('kpiCommands');
  const kpiModeEl = document.getElementById('kpiMode');
  const permListEl = document.getElementById('permStatusList');
  const waveCanvas = document.getElementById('waveCanvas');
  const recTimerEl = document.getElementById('recTimer');
  const tickerRowEl = document.getElementById('tickerRow');
  const gaugeListEl = document.getElementById('gaugeList');
  const coreStatsEl = document.getElementById('coreStats');
  const corePercentEl = document.getElementById('corePercent');

  let commandCount = 0;
  let currentMode = 'STANDBY';
  let activity = 0.1;
  const sessionStart = Date.now();

  // ---------- REC-Timer (Laufzeit seit Sitzungsstart) ----------
  function tickRecTimer() {
    const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    recTimerEl.textContent = `${h}:${m}:${s}`;
  }
  setInterval(tickRecTimer, 1000);
  tickRecTimer();

  // ---------- Daten-Ticker (Kopfzeile) ----------
  const TICKER_ITEMS = [
    { label: 'SYS', base: 128 },
    { label: 'NET', base: 400 },
    { label: 'MEM', base: 62 },
    { label: 'PING', base: 24 },
    { label: 'GPU', base: 8 },
  ];
  function renderTicker() {
    const html = TICKER_ITEMS.map((item) => {
      const delta = (Math.random() * 0.6 - 0.2).toFixed(2);
      const up = delta >= 0;
      return `<span>${item.label}: ${item.base + Math.round(Math.random() * 20)} <span class="${up ? 'ticker-up' : 'ticker-down'}">${up ? '▲' : '▼'} ${Math.abs(delta)}%</span></span>`;
    });
    tickerRowEl.innerHTML = html.concat(html).join(''); // doppelt für nahtlosen Scroll-Loop
  }
  renderTicker();
  setInterval(renderTicker, 4000);

  // ---------- Core-Stats (links neben dem Ring) ----------
  const CORE_STAT_DEFS = [
    { label: 'CORE TEMP', unit: '', base: 2.25, jitter: 0.15 },
    { label: 'FAN VELOCITY', unit: '', base: 47.8, jitter: 3 },
    { label: 'POWER DRAW', unit: 'W', base: 88, jitter: 6 },
    { label: 'LATENCY', unit: 'ms', base: 170, jitter: 12 },
  ];
  function renderCoreStats() {
    coreStatsEl.innerHTML = CORE_STAT_DEFS.map((d) => {
      const val = (d.base + (Math.random() - 0.5) * d.jitter).toFixed(2);
      return `<div class="core-stat"><span>${d.label}</span><span class="val">${val}${d.unit}</span></div>`;
    }).join('');
  }
  renderCoreStats();
  setInterval(renderCoreStats, 3000);

  // ---------- System-Gauges ----------
  const GAUGE_DEFS = [
    { key: 'cpu', label: 'CPU LOAD', base: 40 },
    { key: 'ram', label: 'RAM / MEMORY', base: 55 },
    { key: 'net', label: 'NET O/I', base: 30 },
    { key: 'disk', label: 'DISK I/O', base: 20 },
    { key: 'gpu', label: 'GPU LOAD', base: 15 },
  ];
  const gaugeValues = {};
  GAUGE_DEFS.forEach((g) => { gaugeValues[g.key] = g.base; });

  function renderGauges() {
    gaugeListEl.innerHTML = GAUGE_DEFS.map((g) => `
      <div class="gauge-row">
        <div class="gauge-label"><span>${g.label}</span><span class="val" id="gaugeVal-${g.key}">${Math.round(gaugeValues[g.key])}%</span></div>
        <div class="gauge-track"><div class="gauge-fill" id="gaugeFill-${g.key}" style="width:${gaugeValues[g.key]}%"></div></div>
      </div>
    `).join('');
  }
  renderGauges();

  function updateGauges() {
    const activityBoost = currentMode === 'STANDBY' ? 0 : activity * 25;
    GAUGE_DEFS.forEach((g) => {
      const target = Math.min(96, Math.max(4, g.base + activityBoost + (Math.random() - 0.5) * 8));
      gaugeValues[g.key] += (target - gaugeValues[g.key]) * 0.15;
      const fill = document.getElementById(`gaugeFill-${g.key}`);
      const val = document.getElementById(`gaugeVal-${g.key}`);
      if (fill) fill.style.width = gaugeValues[g.key] + '%';
      if (val) val.textContent = Math.round(gaugeValues[g.key]) + '%';
    });
  }
  setInterval(updateGauges, 700);

  async function refreshKpis() {
    try {
      const mem = await window.jarvis.getMemory();
      kpiFactsEl.textContent = mem.facts.length;
      const learned = await window.jarvis.getLearnedSkills();
      kpiSkillsEl.textContent = learned.skills.length;
      const settings = await window.jarvis.getSettings();
      renderPermissions(settings.permissions || {});
    } catch (e) {
      // still initializing
    }
  }

  function renderPermissions(perms) {
    const items = [
      { key: 'screen', label: 'Bildschirm sehen' },
      { key: 'apps', label: 'Programme starten' },
      { key: 'files', label: 'Dateizugriff' },
    ];
    permListEl.innerHTML = items.map((i) => {
      const on = !!perms[i.key];
      return `<div class="perm-item"><span>${i.label}</span><span class="${on ? 'on' : 'off'}">${on ? 'AKTIV' : 'AUS'}</span></div>`;
    }).join('');
  }

  function setMode(mode) {
    currentMode = mode;
    kpiModeEl.textContent = mode;
    corePercentEl.textContent = mode === 'STANDBY' ? '100%' : mode === 'THINKING' ? '—' : mode === 'LISTENING' ? 'REC' : 'TX';
  }

  function incrementCommands() {
    commandCount += 1;
    kpiCommandsEl.textContent = commandCount;
  }

  function setActivity(level) {
    activity = Math.max(0, Math.min(1, level));
  }

  function targetLevel() {
    return currentMode === 'STANDBY' ? 0.08 : activity * 0.7 + 0.15;
  }

  // Zeichnet eine weiche Kurve durch die Punkte (statt kantiger Geradensegmente)
  function smoothLine(ctx, points, toXY) {
    if (points.length < 2) return;
    ctx.beginPath();
    const first = toXY(points[0], 0);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = toXY(points[i], i);
      const p1 = toXY(points[i + 1], i + 1);
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    const last = toXY(points[points.length - 1], points.length - 1);
    ctx.lineTo(last.x, last.y);
  }

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width;
    const h = rect.height || canvas.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w, h };
  }

  // ---------- Waves / Oszilloskop ----------
  let waveSetup = setupCanvas(waveCanvas);
  window.addEventListener('resize', () => { waveSetup = setupCanvas(waveCanvas); });

  const POINTS = 48;
  const waveTargets = new Array(POINTS).fill(0.1);
  const waveCurrent = new Array(POINTS).fill(0.1);

  setInterval(() => {
    waveTargets.push(Math.max(0.05, targetLevel() * (0.7 + Math.random() * 0.3)));
    waveTargets.shift();
  }, 500);

  function drawWave() {
    const { ctx, w, h } = waveSetup;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < POINTS; i++) {
      waveCurrent[i] += (waveTargets[i] - waveCurrent[i]) * 0.035;
    }

    const step = w / (POINTS - 1);
    const toXY1 = (v, i) => ({ x: i * step, y: h / 2 - v * (h / 2 - 8) });
    const toXY2 = (v, i) => ({ x: i * step, y: h / 2 + v * (h / 2 - 8) * 0.6 });

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    smoothLine(ctx, waveCurrent, toXY1);
    ctx.strokeStyle = '#ff5722';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,87,34,0.5)';
    ctx.shadowBlur = 7;
    ctx.stroke();

    smoothLine(ctx, waveCurrent, toXY2);
    ctx.strokeStyle = 'rgba(77,255,154,0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();

    requestAnimationFrame(drawWave);
  }
  drawWave();

  // ---------- Sidebar-Navigation ----------
  document.querySelectorAll('.sidebar-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
  const sidebarSettings = document.getElementById('sidebarSettings');
  if (sidebarSettings) {
    sidebarSettings.addEventListener('click', () => document.getElementById('settingsBtn').click());
  }

  window.dashboard = { refreshKpis, setMode, incrementCommands, setActivity };
})();
