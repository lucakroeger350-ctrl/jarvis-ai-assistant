(function () {
  const clockEl = document.getElementById('topbarClock');
  const kpiFactsEl = document.getElementById('kpiFacts');
  const kpiSkillsEl = document.getElementById('kpiSkills');
  const kpiCommandsEl = document.getElementById('kpiCommands');
  const kpiModeEl = document.getElementById('kpiMode');
  const permListEl = document.getElementById('permStatusList');
  const waveCanvas = document.getElementById('waveCanvas');
  const barCanvas = document.getElementById('barCanvas');

  let commandCount = 0;
  let currentMode = 'STANDBY';
  let activity = 0.1;

  function tickClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('de-DE');
  }
  setInterval(tickClock, 1000);
  tickClock();

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

  // ---------- Audio-Signal (weiche Doppelwelle) ----------
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
    const toXY1 = (v, i) => ({ x: i * step, y: h / 2 - v * (h / 2 - 10) });
    const toXY2 = (v, i) => ({ x: i * step, y: h / 2 + v * (h / 2 - 10) * 0.65 });

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    smoothLine(ctx, waveCurrent, toXY1);
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 2.2;
    ctx.shadowColor = 'rgba(255,179,71,0.5)';
    ctx.shadowBlur = 8;
    ctx.stroke();

    smoothLine(ctx, waveCurrent, toXY2);
    ctx.strokeStyle = 'rgba(77,255,154,0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();

    requestAnimationFrame(drawWave);
  }
  drawWave();

  // ---------- Aktivität (weiche Balken mit gerundeten Kuppen) ----------
  let barSetup = setupCanvas(barCanvas);
  window.addEventListener('resize', () => { barSetup = setupCanvas(barCanvas); });

  const BAR_COUNT = 9;
  const barTargets = new Array(BAR_COUNT).fill(0.1);
  const barCurrent = new Array(BAR_COUNT).fill(0.1);

  setInterval(() => {
    for (let i = 0; i < BAR_COUNT; i++) {
      barTargets[i] = Math.max(0.05, targetLevel() + (Math.random() - 0.5) * 0.15);
    }
  }, 600);

  function drawBars() {
    const { ctx, w, h } = barSetup;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < BAR_COUNT; i++) {
      barCurrent[i] += (barTargets[i] - barCurrent[i]) * 0.05;
    }

    const gap = 8;
    const barW = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;

    barCurrent.forEach((v, i) => {
      const barH = Math.max(4, v * (h - 6));
      const x = i * (barW + gap);
      const y = h - barH;
      const radius = Math.min(barW / 2, 6);

      const grad = ctx.createLinearGradient(0, y, 0, h);
      grad.addColorStop(0, '#ffb347');
      grad.addColorStop(1, '#ff5a3c');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.lineTo(x + barW - radius, y);
      ctx.arcTo(x + barW, y, x + barW, y + radius, radius);
      ctx.lineTo(x + barW, h);
      ctx.lineTo(x, h);
      ctx.closePath();
      ctx.fill();
    });

    requestAnimationFrame(drawBars);
  }
  drawBars();

  window.dashboard = { refreshKpis, setMode, incrementCommands, setActivity };
})();
