(function () {
  // Arc-Reactor-Ring "Core Status"-Widget: mehrere gegenläufig rotierende
  // Ringe um ein leuchtendes Pentagon mit Prozentanzeige - reagiert auf den
  // Assistenten-Status (idle / listening / thinking / speaking).

  function createCoreRing(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const cssSize = canvas.width;
    canvas.width = cssSize * dpr;
    canvas.height = cssSize * dpr;
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const W = cssSize;
    const H = cssSize;
    const cx = W / 2;
    const cy = H / 2;
    const R = W * 0.46;

    let state = 'idle';
    let level = 0;
    let energy = 0.1;
    let t = 0;

    const ACCENTS = {
      orange: '#ff5722',
      blue: '#2f9bff',
      green: '#2fdb7e',
      purple: '#9d5fef',
      cyan: '#17c9e0',
    };
    const STATE_COLORS = {
      listening: '#4dff9a',
      thinking: '#ff5722',
      speaking: '#ff3b30',
    };

    let accent = 'orange';

    function currentColor() {
      return STATE_COLORS[state] || ACCENTS[accent] || ACCENTS.orange;
    }

    function setState(newState) { state = newState; }
    function setLevel(l) { level = Math.max(0, Math.min(1, l)); }
    function setAccent(theme) { accent = theme; }

    function targetEnergy() {
      if (state === 'idle') return 0.08;
      if (state === 'listening') return 0.3 + level * 0.25;
      if (state === 'thinking') return 0.5;
      if (state === 'speaking') return 0.55 + level * 0.35;
      return 0.08;
    }

    function drawRing(radius, width, dashCount, rotation, alpha, color) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      const dashLen = (Math.PI * 2 * radius) / dashCount * 0.55;
      const gapLen = (Math.PI * 2 * radius) / dashCount * 0.45;
      ctx.setLineDash([dashLen, gapLen]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.stroke();
      ctx.restore();
    }

    function drawPentagon(radius, color, fillAlpha, rotation, lineWidth) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation || 0);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = lineWidth || 2;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Kleine leuchtende Knoten, die auf einem Radius umlaufen (wie Satelliten).
    function drawOrbitingNodes(radius, count, rotation, color, size) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    function draw() {
      t += 0.012;
      ctx.clearRect(0, 0, W, H);

      const color = currentColor();
      energy += (targetEnergy() - energy) * 0.05;
      const spin = 0.15 + energy * 0.5;

      // Ambientes Glühen
      const glow = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.3);
      glow.addColorStop(0, color + '33');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Äußere Ringe, gegenläufig rotierend (mehrschichtig verschachtelt)
      drawRing(R, 2, 48, t * spin, 0.9, color);
      drawRing(R * 0.92, 1, 90, -t * spin * 0.6, 0.35, color);
      drawRing(R * 0.82, 1.5, 32, -t * spin * 1.4, 0.65, color);
      drawRing(R * 0.74, 1, 60, t * spin * 1.1, 0.3, color);
      drawRing(R * 0.66, 3, 24, t * spin * 0.7, 0.45 + energy * 0.3, color);
      drawRing(R * 0.55, 1, 40, -t * spin * 1.8, 0.28, color);

      // Umlaufende Satelliten-Knoten
      drawOrbitingNodes(R * 0.88, 3, t * spin * 0.8, color, 2.4 + energy * 1.5);
      drawOrbitingNodes(R * 0.74, 6, -t * spin * 1.2, color, 1.6);

      // Feine Tick-Marks außen
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 72; i++) {
        const angle = (i / 72) * Math.PI * 2;
        const major = i % 6 === 0;
        const inner = R * 1.05;
        const outer = inner + (major ? 8 : 4);
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.strokeStyle = color;
        ctx.globalAlpha = major ? 0.55 : 0.2;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      // Innere, energiereaktive Kernscheibe hinter dem Pentagon
      ctx.save();
      ctx.translate(cx, cy);
      const core = ctx.createRadialGradient(0, 0, 2, 0, 0, R * 0.46);
      core.addColorStop(0, color + 'cc');
      core.addColorStop(0.5, color + '44');
      core.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.5 + energy * 0.4;
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;

      // Zwei gegenläufig rotierende Pentagone im Zentrum
      drawPentagon(R * 0.42 * (0.9 + energy * 0.15), color, 0.14 + energy * 0.12, t * spin * 0.5, 2);
      drawPentagon(R * 0.30 * (0.9 + energy * 0.15), color, 0.06, -t * spin * 0.9, 1);

      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }

    draw();
    return { setState, setLevel, setAccent };
  }

  window.hud = createCoreRing('reactorCanvas');
})();
