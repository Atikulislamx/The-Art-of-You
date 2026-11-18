export const clamp = (v, low = 0, high = 1) => Math.min(high, Math.max(low, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeLoop(draw) {
  let frame = 0;
  let last = null;
  const tick = now => {
    frame = 0;
    const dt = last === null ? 16.67 : Math.min(48, now - last);
    last = now;
    if (draw(now, dt)) frame = requestAnimationFrame(tick);
    else last = null;
  };
  return {
    start() { if (!frame) frame = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(frame); frame = 0; last = null; },
  };
}

// Canvas coordinates stay in CSS pixels; the backing store is bounded to limit mobile GPU work.
export function fitCanvas(stage, canvas, maxDpr, onResize = () => {}) {
  let ctx = null;
  try { ctx = canvas?.getContext('2d') ?? null; } catch { /* canvas is optional */ }
  const surface = { ctx, w: 0, h: 0, dpr: 1 };
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!(w && h)) return;
    const dpr = Math.min(Math.max(1, Number(maxDpr) || 1), globalThis.devicePixelRatio || 1, Math.max(1, Math.sqrt(2200000 / (w * h))));
    if (w === surface.w && h === surface.h && dpr === surface.dpr) return;
    Object.assign(surface, { w, h, dpr });
    if (ctx) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(canvas.width / w, 0, 0, canvas.height / h, 0, 0);
    }
    onResize(surface);
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(stage);
  window.addEventListener('resize', resize);
  resize();
  surface.dispose = () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  return surface;
}

export function diamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size * 1.55);
  ctx.quadraticCurveTo(x + size * .27, y - size * .28, x + size, y);
  ctx.quadraticCurveTo(x + size * .27, y + size * .28, x, y + size * 1.55);
  ctx.quadraticCurveTo(x - size * .27, y + size * .28, x - size, y);
  ctx.quadraticCurveTo(x - size * .27, y - size * .28, x, y - size * 1.55);
  ctx.fill();
}

export function drawPetal(ctx, size) {
  ctx.beginPath();
  ctx.moveTo(0, size * .62);
  ctx.bezierCurveTo(-size * .82, size * .27, -size * .73, -size * .51, -size * .22, -size * .48);
  ctx.bezierCurveTo(size * .1, -size * .94, size * .74, -size * .45, size * .55, -.05 * size);
  ctx.quadraticCurveTo(size * .37, size * .39, 0, size * .62);
  ctx.fill();
}

export function mountWish(plate, { animation, features }, motion, signal) {
  if (!features.ambientParticles) return;
  const random = seededRandom(26);
  const particles = Array.from({ length: 44 }, () => ({
    x: random(), y: random(), size: .6 + random() * 1.7, phase: random() * TAU,
    speed: .008 + random() * .02, gold: random() > .4,
  }));
  let elapsed = 0;
  const loop = makeLoop((_, dt) => {
    const { ctx, w, h } = surface;
    if (!ctx) return false;
    if (!motion.matches) elapsed += dt / 1000;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      const py = ((p.y - elapsed * p.speed) % 1 + 1) % 1;
      const x = w * p.x + Math.sin(elapsed * .42 + p.phase) * 16;
      ctx.globalAlpha = (.16 + (1 + Math.sin(p.phase + elapsed * 1.25)) * .14) * Math.min(1, py * 10, (1 - py) * 10);
      ctx.fillStyle = p.gold ? '#f2d292' : '#e5a5b0';
      if (p.size > 1.8) diamond(ctx, x, h * py, p.size);
      else { ctx.beginPath(); ctx.arc(x, h * py, p.size, 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    return !motion.matches;
  });
  const surface = fitCanvas(plate, plate.querySelector('canvas'), animation.maxDpr, () => loop.start());
  motion.addEventListener('change', () => loop.start(), { signal });
  signal.addEventListener('abort', () => { loop.stop(); surface.dispose(); }, { once: true });
}
