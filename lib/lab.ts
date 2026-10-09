/**
 * Helper utilities and sample templates for Interactive Math Labs and Games
 */

export function prepareLabSrcDoc(rawCode?: string): string {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return '';
  }

  const trimmed = rawCode.trim();

  // If instructor pasted complete HTML document
  if (/<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    // Ensure viewport meta exists for mobile responsiveness
    if (!/<meta\s+name=["']viewport["']/i.test(trimmed)) {
      return trimmed.replace(
        /<head[\s>]/i,
        `<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">`
      );
    }
    return trimmed;
  }

  // If instructor pasted an <iframe> snippet (e.g. GeoGebra, Desmos, Canva, PhET embed)
  if (/<iframe[\s>]/i.test(trimmed)) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Interactive Lab</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    iframe {
      width: 100% !important;
      height: 100% !important;
      border: 0 !important;
      display: block;
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
  }

  // Raw HTML, CSS, & JavaScript game / simulation widget
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Interactive Math Lab</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  ${trimmed}
</body>
</html>`;
}

export const SAMPLE_MATH_LAB_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quadratic Trajectory Lab</title>
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .header { text-align: center; margin-bottom: 12px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; color: #38bdf8; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .canvas-container {
      position: relative;
      background: #1e293b;
      border: 2px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
    }
    canvas { display: block; }
    .controls {
      margin-top: 14px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
      max-width: 600px;
      background: #1e293b;
      padding: 12px 18px;
      border-radius: 14px;
      border: 1px solid #334155;
    }
    .slider-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .slider-group span { font-weight: bold; color: #38bdf8; }
    input[type=range] { accent-color: #38bdf8; cursor: pointer; }
    .btn {
      background: #38bdf8;
      color: #0f172a;
      border: none;
      padding: 8px 18px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .btn:hover { background: #7dd3fc; transform: scale(1.02); }
    .stats {
      margin-top: 10px;
      font-size: 13px;
      color: #a7f3d0;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 Parabola Target Launch Game</h1>
    <p>Adjust parameters <strong>a</strong> and <strong>h</strong> to launch the projectile and hit the star target!</p>
  </div>

  <div class="canvas-container">
    <canvas id="gameCanvas" width="560" height="320"></canvas>
  </div>

  <div class="controls">
    <div class="slider-group">
      <label>Curvature (a): <span id="valA">-0.005</span></label>
      <input type="range" id="sliderA" min="-0.015" max="-0.001" step="0.0005" value="-0.005">
    </div>
    <div class="slider-group">
      <label>Apex Distance (h): <span id="valH">280</span></label>
      <input type="range" id="sliderH" min="150" max="450" step="5" value="280">
    </div>
    <div class="slider-group">
      <label>Apex Height (k): <span id="valK">220</span></label>
      <input type="range" id="sliderK" min="100" max="280" step="5" value="220">
    </div>
    <button class="btn" id="launchBtn">🎯 Launch!</button>
    <button class="btn" id="resetBtn" style="background:#64748b; color:white;">🔄 New Target</button>
  </div>

  <div class="stats" id="statusMsg">🎯 Adjust sliders and click Launch!</div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const sliderA = document.getElementById('sliderA');
    const sliderH = document.getElementById('sliderH');
    const sliderK = document.getElementById('sliderK');
    const valA = document.getElementById('valA');
    const valH = document.getElementById('valH');
    const valK = document.getElementById('valK');
    const statusMsg = document.getElementById('statusMsg');

    let a = parseFloat(sliderA.value);
    let h = parseFloat(sliderH.value);
    let k = parseFloat(sliderK.value);

    let target = { x: 440, y: 180, radius: 20 };
    let projectile = { x: 40, y: 300, active: false, t: 0 };
    let score = 0;

    function resetTarget() {
      target.x = 280 + Math.random() * 220;
      target.y = 80 + Math.random() * 180;
      statusMsg.textContent = '⭐ New target placed! Calculate trajectory to hit it.';
      statusMsg.style.color = '#a7f3d0';
      draw();
    }

    function updateSliders() {
      a = parseFloat(sliderA.value);
      h = parseFloat(sliderH.value);
      k = parseFloat(sliderK.value);
      valA.textContent = a.toFixed(4);
      valH.textContent = h;
      valK.textContent = k;
      draw();
    }

    sliderA.addEventListener('input', updateSliders);
    sliderH.addEventListener('input', updateSliders);
    sliderK.addEventListener('input', updateSliders);

    function calcY(x) {
      // Vertex form: y = a * (x - h)^2 + k (inverted for canvas coordinate system)
      const graphY = a * Math.pow(x - h, 2) + k;
      return 300 - graphY;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Ground
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(0, 300, canvas.width, 20);

      // Trajectory curve preview (dashed)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (let x = 40; x <= 540; x += 4) {
        const y = calcY(x);
        if (x === 40) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Target
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', target.x, target.y);

      // Cannon / Launcher
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(40, 300, 16, Math.PI, 0);
      ctx.fill();

      // Projectile
      if (projectile.active) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    document.getElementById('launchBtn').addEventListener('click', () => {
      if (projectile.active) return;
      projectile.x = 40;
      projectile.active = true;
      statusMsg.textContent = '🚀 In flight...';

      const anim = setInterval(() => {
        projectile.x += 6;
        projectile.y = calcY(projectile.x);

        // Check target collision
        const dist = Math.hypot(projectile.x - target.x, projectile.y - target.y);
        if (dist < target.radius + 8) {
          clearInterval(anim);
          projectile.active = false;
          score += 100;
          statusMsg.textContent = '🎉 DIRECT HIT! +100 Points! Fantastic math!';
          statusMsg.style.color = '#34d399';
          setTimeout(resetTarget, 1200);
          return;
        }

        // Ground hit or out of bounds
        if (projectile.x > canvas.width || projectile.y >= 300) {
          clearInterval(anim);
          projectile.active = false;
          statusMsg.textContent = '💥 Missed! Adjust your parameters and try again.';
          statusMsg.style.color = '#f87171';
          draw();
        } else {
          draw();
        }
      }, 16);
    });

    document.getElementById('resetBtn').addEventListener('click', resetTarget);

    updateSliders();
    resetTarget();
  </script>
</body>
</html>`;

export const PRESET_LAB_URLS = [
  {
    name: 'PhET Fraction Matcher',
    url: 'https://phet.colorado.edu/sims/html/fraction-matcher/latest/fraction-matcher_all.html'
  },
  {
    name: 'PhET Area Model Algebra',
    url: 'https://phet.colorado.edu/sims/html/area-model-algebra/latest/area-model-algebra_all.html'
  },
  {
    name: 'GeoGebra Graphing Calculator',
    url: 'https://www.geogebra.org/graphing'
  },
  {
    name: 'GeoGebra Geometry',
    url: 'https://www.geogebra.org/geometry'
  },
  {
    name: 'Desmos Scientific Calculator',
    url: 'https://www.desmos.com/scientific'
  }
];
