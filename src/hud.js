(function () {
  // Rotierende Holo-Kugel im Stil von Tony Starks Hologramm-Globus (Iron Man) -
  // ein drahtgitterartiger, leuchtender Globus aus Breiten-/Längenkreisen mit
  // funkelnden Lichtpunkten, der sich ständig sanft dreht und auf den
  // Assistenten-Status reagiert (idle / listening / thinking / speaking).

  function createOrb(canvasId) {
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
    const R = W * 0.30;
    const FOCAL = R * 3.2;

    let state = 'idle';
    let level = 0;
    let energy = 0.12;
    let ry = 0; // Rotation um die Y-Achse
    let t = Math.random() * 100;

    const ACCENTS = {
      orange: '#ff9d2e',
      blue: '#4fc3ff',
      green: '#5dffa0',
      purple: '#c58bff',
      cyan: '#4dfff5',
    };
    const STATE_COLORS = {
      listening: '#4dff9a',
      thinking: '#ff9d2e',
      speaking: '#ff5a3c',
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
      if (state === 'thinking') return 0.45;
      if (state === 'speaking') return 0.55 + level * 0.35;
      return 0.08;
    }

    function targetSpin() {
      if (state === 'idle') return 0.15;
      if (state === 'listening') return 0.35;
      if (state === 'thinking') return 0.75;
      if (state === 'speaking') return 0.55;
      return 0.15;
    }

    // Rotiert einen 3D-Punkt um die Y-Achse (und leicht um X für einen Kippwinkel)
    function rotate(p) {
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      let x = p.x * cosY - p.z * sinY;
      let z = p.x * sinY + p.z * cosY;
      const tilt = 0.28;
      const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
      const y = p.y * cosX - z * sinX;
      z = p.y * sinX + z * cosX;
      return { x, y, z };
    }

    function project(p) {
      const scale = FOCAL / (FOCAL + p.z);
      return { x: cx + p.x * scale, y: cy + p.y * scale, scale };
    }

    // Breitenkreise (Latitude) - horizontale Ringe
    function buildLatitudeRings(count, segments) {
      const rings = [];
      for (let i = 1; i < count; i++) {
        const phi = (-Math.PI / 2) + (i / count) * Math.PI;
        const ringR = Math.cos(phi) * R;
        const y = Math.sin(phi) * R;
        const pts = [];
        for (let j = 0; j <= segments; j++) {
          const theta = (j / segments) * Math.PI * 2;
          pts.push({ x: Math.cos(theta) * ringR, y, z: Math.sin(theta) * ringR });
        }
        rings.push(pts);
      }
      return rings;
    }

    // Längenkreise (Longitude) - vertikale Ringe
    function buildLongitudeRings(count, segments) {
      const rings = [];
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI;
        const pts = [];
        for (let j = 0; j <= segments; j++) {
          const phi = (j / segments) * Math.PI * 2;
          pts.push({
            x: Math.cos(phi) * Math.cos(theta) * R,
            y: Math.sin(phi) * R,
            z: Math.cos(phi) * Math.sin(theta) * R,
          });
        }
        rings.push(pts);
      }
      return rings;
    }

    const latRings = buildLatitudeRings(7, 48);
    const lonRings = buildLongitudeRings(9, 48);

    // Feste, zufällig verteilte Funkelpunkte auf der Kugeloberfläche
    const sparks = Array.from({ length: 46 }, () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      return {
        x: Math.sin(phi) * Math.cos(theta) * R,
        y: Math.cos(phi) * R,
        z: Math.sin(phi) * Math.sin(theta) * R,
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 2.5,
      };
    });

    function drawRing(pts, color, baseAlpha) {
      ctx.beginPath();
      let started = false;
      let lastVisible = false;
      for (let i = 0; i < pts.length; i++) {
        const rotated = rotate(pts[i]);
        const proj = project(rotated);
        const depthAlpha = (rotated.z / R) * -0.35 + 0.55; // vorne heller, hinten dezenter
        const visible = depthAlpha > 0.05;
        if (!visible) { started = false; continue; }
        if (!started || !lastVisible) {
          ctx.moveTo(proj.x, proj.y);
          started = true;
        } else {
          ctx.lineTo(proj.x, proj.y);
        }
        lastVisible = visible;
      }
      ctx.strokeStyle = color;
      ctx.globalAlpha = baseAlpha;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function draw() {
      t += 0.016;
      ctx.clearRect(0, 0, W, H);

      const color = currentColor();
      energy += (targetEnergy() - energy) * 0.05;
      ry += 0.006 + targetSpin() * 0.01 + energy * 0.01;

      // Ambientes Umgebungsglühen
      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.1);
      glow.addColorStop(0, color + '33');
      glow.addColorStop(1, 'transparent');
      ctx.globalAlpha = 1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Innerer Kernschimmer
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      core.addColorStop(0, color + 'aa');
      core.addColorStop(1, 'transparent');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = color;
      ctx.shadowBlur = 5 + energy * 10;

      latRings.forEach((pts) => drawRing(pts, color, 0.4 + energy * 0.2));
      lonRings.forEach((pts) => drawRing(pts, color, 0.28 + energy * 0.15));

      ctx.shadowBlur = 0;

      // Funkelnde Lichtpunkte auf der Oberfläche
      sparks.forEach((s) => {
        const rotated = rotate(s);
        const proj = project(rotated);
        const depthAlpha = (rotated.z / R) * -0.4 + 0.5;
        if (depthAlpha <= 0.05) return;
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        ctx.globalAlpha = depthAlpha * twinkle;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 1.6 * proj.scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      requestAnimationFrame(draw);
    }

    draw();
    return { setState, setLevel, setAccent };
  }

  window.hud = createOrb('reactorCanvas');
})();
