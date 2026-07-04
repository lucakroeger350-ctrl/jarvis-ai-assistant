(function () {
  const canvas = document.getElementById('globeCanvas');
  const coordList = document.getElementById('coordList');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const size = canvas.width;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.42;

  const LOCATIONS = [
    { name: 'BERLIN', lat: 52, lon: 13 },
    { name: 'NEW YORK', lat: 40, lon: -74 },
    { name: 'TOKYO', lat: 35, lon: 139 },
    { name: 'LONDON', lat: 51, lon: 0 },
  ];

  function renderCoordList(times) {
    coordList.innerHTML = LOCATIONS.map((l) => {
      const match = times && times.find((t) => t.name.toUpperCase() === l.name || l.name.includes(t.name.toUpperCase()));
      const statusText = match ? `${match.time} UHR` : 'ACTIVE';
      return `
        <div class="coord-row">
          <span>${l.name}</span>
          <span>${l.lat.toFixed(1)}°N ${l.lon.toFixed(1)}°</span>
          <span class="status-active">${statusText}</span>
        </div>
      `;
    }).join('');
  }
  renderCoordList();

  // Punkte auf der Kugel projizieren (einfache Orthogonalprojektion, Rotation um Y-Achse)
  function project(lat, lon, rotY) {
    const phi = (lat / 180) * Math.PI;
    const theta = (lon / 180) * Math.PI + rotY;
    const x = Math.cos(phi) * Math.sin(theta);
    const y = -Math.sin(phi);
    const z = Math.cos(phi) * Math.cos(theta);
    return { x: cx + x * R, y: cy + y * R, z, visible: z > -0.15 };
  }

  const gridLats = [-60, -30, 0, 30, 60];
  const gridLons = Array.from({ length: 12 }, (_, i) => i * 30 - 180);

  let t = 0;
  let autoRotate = true;
  let focusQueue = [];
  let focusIndex = 0;
  let focusHoldUntil = 0;

  function startFocusTour(cities) {
    focusQueue = cities;
    focusIndex = 0;
    autoRotate = false;
    focusHoldUntil = 0;
    renderCoordList(cities);
  }

  if (window.jarvis && window.jarvis.onGlobeFocusCities) {
    window.jarvis.onGlobeFocusCities((cities) => startFocusTour(cities));
  }

  function updateRotation() {
    if (autoRotate) {
      t += 0.0035;
      return;
    }
    if (focusIndex >= focusQueue.length) {
      autoRotate = true;
      return;
    }
    const target = focusQueue[focusIndex];
    const targetRot = -((target.lon / 180) * Math.PI);
    const now = Date.now();

    if (Math.abs(((t - targetRot + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.02) {
      if (!focusHoldUntil) focusHoldUntil = now + 2200;
      if (now >= focusHoldUntil) {
        focusIndex += 1;
        focusHoldUntil = 0;
      }
      return;
    }
    t += (targetRot - t) * 0.04;
  }

  function draw() {
    updateRotation();
    ctx.clearRect(0, 0, size, size);

    // Atmosphären-Glühen um die Kugel (Halo)
    const atmo = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.28);
    atmo.addColorStop(0, 'rgba(255,87,34,0.22)');
    atmo.addColorStop(1, 'rgba(255,87,34,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2);
    ctx.fill();

    // Kugel-Silhouette
    const sphereGrad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    sphereGrad.addColorStop(0, 'rgba(255,87,34,0.14)');
    sphereGrad.addColorStop(1, 'rgba(10,8,7,0.9)');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,87,34,0.55)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255,87,34,0.5)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Breiten-/Längengitter
    ctx.strokeStyle = 'rgba(255,87,34,0.22)';
    ctx.lineWidth = 1;
    gridLats.forEach((lat) => {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 6) {
        const p = project(lat, lon, t);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
    gridLons.forEach((lon) => {
      ctx.beginPath();
      let started = false;
      for (let lat = -90; lat <= 90; lat += 6) {
        const p = project(lat, lon, t);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });

    // Aktive Standorte + Verbindungslinien
    const projected = LOCATIONS.map((l) => ({ ...l, p: project(l.lat, l.lon, t) }));
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const a = projected[i].p;
        const b = projected[j].p;
        if (!a.visible || !b.visible) continue;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2 - 22;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(midX, midY, b.x, b.y);
        ctx.strokeStyle = 'rgba(255,204,51,0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }
    projected.forEach(({ p, name }) => {
      if (!p.visible) return;
      const isFocused = !autoRotate && focusQueue[focusIndex] && name.includes(focusQueue[focusIndex].name.toUpperCase());
      ctx.beginPath();
      ctx.arc(p.x, p.y, isFocused ? 4.5 : 2.6, 0, Math.PI * 2);
      ctx.fillStyle = isFocused ? '#ff5722' : '#ffcc33';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = isFocused ? 12 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    requestAnimationFrame(draw);
  }

  draw();
})();
