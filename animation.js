(() => {
  const canvas = document.getElementById("slime-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Find the hero name container (canvas parent)
  const wrapper = canvas.parentElement;

  let w = 0, h = 0, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize() {
    const rect = wrapper.getBoundingClientRect();
    w = Math.max(260, Math.floor(rect.width));   // minimum size so it still looks good on small screens
    h = Math.max(90, Math.floor(rect.height));

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const balls = [];
  const BALLS = 7;

  function rand(min, max) { return min + Math.random() * (max - min); }

  function initBalls() {
    balls.length = 0;
    for (let i = 0; i < BALLS; i++) {
      balls.push({
        x: rand(0, w),
        y: rand(0, h),
        vx: rand(-0.35, 0.35),
        vy: rand(-0.25, 0.25),
        r: rand(22, 40)
      });
    }
  }

  // Optional: subtle “attention” toward cursor, feels more alive
  let mouse = { x: null, y: null };
  wrapper.addEventListener("mousemove", (e) => {
    const rect = wrapper.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  wrapper.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  function step() {
    ctx.clearRect(0, 0, w, h);

    // Draw metaballs (solid fill, then CSS filter makes it slime)
    // You can tweak colors here:
    // - teal core + faint glow
    ctx.globalCompositeOperation = "source-over";
    for (const b of balls) {
      // movement
      b.x += b.vx;
      b.y += b.vy;

      // bounce inside wrapper
      if (b.x < b.r || b.x > w - b.r) b.vx *= -1;
      if (b.y < b.r || b.y > h - b.r) b.vy *= -1;

      // tiny attraction to mouse (LLM “attention” vibe)
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - b.x;
        const dy = mouse.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 140) {
          b.vx += (dx / dist) * 0.0025;
          b.vy += (dy / dist) * 0.0025;
        }
      }

      // soft friction so it doesn’t get chaotic
      b.vx *= 0.995;
      b.vy *= 0.995;

      // gradient blob
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, "rgba(34,211,238,0.90)");  // teal
      g.addColorStop(1, "rgba(34,211,238,0.00)");

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add a few tiny “neuron sparks”
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 10; i++) {
      const x = rand(0, w);
      const y = rand(0, h);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    requestAnimationFrame(step);
  }

  // Init + observers
  resize();
  initBalls();
  step();

  // Keep it aligned when responsive text changes size
  window.addEventListener("resize", () => {
    resize();
    initBalls();
  });

  // If fonts load later and size shifts, this catches it
  const ro = new ResizeObserver(() => {
    resize();
  });
  ro.observe(wrapper);
})();