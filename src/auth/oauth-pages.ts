const SHARED_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
    background: #0a0a0f;
    color: #e0e0e8;
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
  }

  .container {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 3rem;
  }

  .logo {
    font-size: 4rem;
    margin-bottom: 1rem;
    animation: float 3s ease-in-out infinite;
    filter: drop-shadow(0 0 20px rgba(255, 210, 60, 0.4));
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-12px); }
  }

  .title {
    font-size: 1.6rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #ffd23c, #ff9f1c, #ffdd57);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: fadeUp 0.8s ease-out both;
  }

  .subtitle {
    font-size: 0.95rem;
    color: #8888a0;
    animation: fadeUp 0.8s ease-out 0.2s both;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding: 0.6rem 1.4rem;
    border-radius: 100px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    animation: fadeUp 0.8s ease-out 0.4s both;
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
    50% { opacity: 0.7; box-shadow: 0 0 12px 4px currentColor; }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .close-hint {
    margin-top: 1.5rem;
    font-size: 0.75rem;
    color: #555568;
    animation: fadeUp 0.8s ease-out 0.6s both;
  }

  .close-hint kbd {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border: 1px solid #333348;
    border-radius: 4px;
    background: #16161e;
    font-family: inherit;
    font-size: 0.75rem;
  }
`

const PARTICLE_CANVAS_SCRIPT = `
  const canvas = document.getElementById('bg');
  const ctx = canvas.getContext('2d');
  let w, h, particles, connections;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    const count = Math.min(80, Math.floor((w * h) / 12000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 2 + 0.5,
      hue: 40 + Math.random() * 20,
    }));
  }

  function draw() {
    ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + p.hue + ', 90%, 65%, 0.8)';
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = 'hsla(45, 80%, 55%, ' + (1 - dist / 140) * 0.15 + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
`

export function renderSuccessPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nano Banana - Connected</title>
  <style>${SHARED_STYLES}
    .badge {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.25);
      color: #4ade80;
    }
    .badge-dot {
      background: #4ade80;
      color: rgba(34, 197, 94, 0.4);
    }
  </style>
</head>
<body>
  <canvas id="bg"></canvas>
  <div class="container">
    <div class="logo">&#x1F34C;</div>
    <div class="title">NANO BANANA</div>
    <div class="subtitle">Authorization complete</div>
    <div class="badge">
      <span class="badge-dot"></span>
      CONNECTED
    </div>
    <div class="close-hint">You can close this tab and return to the terminal</div>
  </div>
  <script>${PARTICLE_CANVAS_SCRIPT}</script>
</body>
</html>`
}

export function renderErrorPage(error: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nano Banana - Error</title>
  <style>${SHARED_STYLES}
    .badge {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: #f87171;
    }
    .badge-dot {
      background: #f87171;
      color: rgba(239, 68, 68, 0.4);
    }
    .error-detail {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: #666680;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
      animation: fadeUp 0.8s ease-out 0.5s both;
    }
    .error-detail code {
      display: inline-block;
      margin-top: 0.4rem;
      padding: 0.3rem 0.7rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.15);
      border-radius: 6px;
      color: #f87171;
      font-family: inherit;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <canvas id="bg"></canvas>
  <div class="container">
    <div class="logo">&#x1F34C;</div>
    <div class="title">NANO BANANA</div>
    <div class="subtitle">Authorization failed</div>
    <div class="badge">
      <span class="badge-dot"></span>
      ERROR
    </div>
    <div class="error-detail">
      <code>${error.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
    </div>
    <div class="close-hint">Close this tab and try again from the terminal</div>
  </div>
  <script>${PARTICLE_CANVAS_SCRIPT}</script>
</body>
</html>`
}

export function renderMissingCodePage(): string {
  return renderErrorPage('No authorization code received')
}
