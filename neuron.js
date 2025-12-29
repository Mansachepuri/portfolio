(() => {
  const canvas = document.getElementById("ai-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  let w = 0, h = 0, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let nodes = [];
  let pulses = [];
  let mouse = { x: null, y: null };

  // ---- Config (professional/subtle) ----
  const CFG = {
    nodeCount: 90,
    maxLinkDist: 165,
    nodeRadiusMin: 1.2,
    nodeRadiusMax: 2.4,
    speed: 0.22,
    pulseRate: 0.022,       // higher = more pulses
    pulseSpeed: 0.012,      // along line
    pulseSize: 1.6,
    fadeEdges: true
  };

  function resize() {
    w = canvas.width = Math.floor(window.innerWidth * dpr);
    h = canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // re-seed nodes on resize
    seedNodes();
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function seedNodes() {
    nodes = Array.from({ length: CFG.nodeCount }, () => ({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      vx: rand(-CFG.speed, CFG.speed),
      vy: rand(-CFG.speed, CFG.speed),
      r: rand(CFG.nodeRadiusMin, CFG.nodeRadiusMax)
    }));
    pulses = [];
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  // Mouse “attention”
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Create a pulse traveling from node i to j
  function spawnPulse(i, j) {
    pulses.push({
      i, j,
      t: 0,                 // 0..1 progress
      life: rand(0.7, 1.0)  // subtle variability
    });
  }

  function update() {
    // Move nodes
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      // gentle bounds bounce
      if (n.x < 0 || n.x > window.innerWidth) n.vx *= -1;
      if (n.y < 0 || n.y > window.innerHeight) n.vy *= -1;

      // subtle attraction/repulsion near mouse (professional, not jumpy)
      if (mouse.x != null && mouse.y != null) {
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 180) {
          const pull = (180 - d) / 180;
          n.vx += (dx / d) * pull * 0.002;
          n.vy += (dy / d) * pull * 0.002;
        }
      }

      // dampen velocity so it stays smooth
      n.vx *= 0.995;
      n.vy *= 0.995;
    }

    // Random pulse generation on existing near links
    if (Math.random() < CFG.pulseRate) {
      // pick a random node and connect to a near neighbor
      const i = Math.floor(Math.random() * nodes.length);
      let bestJ = -1;
      let bestD = 999999;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const d = dist(nodes[i], nodes[j]);
        if (d < CFG.maxLinkDist && d < bestD) {
          bestD = d;
          bestJ = j;
        }
      }
      if (bestJ !== -1) spawnPulse(i, bestJ);
    }

    // Update pulses
    for (const p of pulses) p.t += CFG.pulseSpeed;
    pulses = pulses.filter(p => p.t <= 1.0);
  }

  function edgeFadeAlpha(x, y) {
    if (!CFG.fadeEdges) return 1;
    const mx = Math.min(x, window.innerWidth - x);
    const my = Math.min(y, window.innerHeight - y);
    const m = Math.min(mx, my);
    return clamp(m / 180, 0, 1); // fade near edges
  }

  function draw() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Background darkening for extra polish
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Links
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = dist(a, b);
        if (d > CFG.maxLinkDist) continue;

        const alpha = (1 - d / CFG.maxLinkDist) * 0.35 *
                      edgeFadeAlpha((a.x + b.x) / 2, (a.y + b.y) / 2);

        ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Pulses (signals traveling along synapses)
    for (const p of pulses) {
      const a = nodes[p.i], b = nodes[p.j];
      const x = a.x + (b.x - a.x) * p.t;
      const y = a.y + (b.y - a.y) * p.t;

      const core = 0.55 * p.life * edgeFadeAlpha(x, y);
      ctx.beginPath();
      ctx.arc(x, y, CFG.pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${core})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, CFG.pulseSize * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${0.18 * p.life})`;
      ctx.fill();
    }

    // Nodes
    for (const n of nodes) {
      const a = 0.65 * edgeFadeAlpha(n.x, n.y);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${a})`;
      ctx.fill();

      // tiny highlight makes it crisp (professional)
      ctx.beginPath();
      ctx.arc(n.x - n.r * 0.35, n.y - n.r * 0.35, n.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.10 * a})`;
      ctx.fill();
    }

    requestAnimationFrame(loop);
  }

  function loop() {
    update();
    draw();
  }

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(loop);
})();