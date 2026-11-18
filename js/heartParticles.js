import { clamp, diamond, drawPetal, seededRandom, TAU } from './effects.js';

export function makeHeartBurst(x, y, size, count) {
  const random = seededRandom(101);
  const shades = ['#A2314A', '#B83A52', '#702F43', '#DC8197', '#F5AEB7', '#F4CCA2', '#E3B36B', '#FFF0C2'];
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = random() * TAU;
    const rho = Math.sqrt(random());
    const pace = (.24 + random() * .88) * size;
    const diffuse = i < count * .72;
    const hx = 16 * Math.sin(angle) ** 3 / 34;
    const hy = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 34;
    return {
      dx: diffuse ? hx * rho * size : 0, dy: diffuse ? hy * rho * size : 0,
      vx: Math.sin(angle) * pace + 14, vy: -Math.cos(angle) * pace * .79 - 16,
      size: (1.15 + random() ** 1.7 * 5.1) * clamp(size / 170, .72, 1.45),
      spin: (random() - .5) * 5, phase: random() * TAU,
      life: .45 + random() * .72, color: shades[Math.floor(random() * shades.length)],
      type: i % 5 === 0 ? 'petal' : i % 3 === 0 ? 'spark' : 'dust',
    };
  });
  return { x, y, size, particles };
}

export function drawHeartBurst(ctx, burst, elapsed) {
  if (!ctx) return;
  const { x, y, size, particles } = burst;
  const t = elapsed / 1000;
  const light = clamp(1 - t / .38);
  if (light > 0) {
    const radius = size * (.24 + t * 1.45);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, '#fff5d7');
    glow.addColorStop(.24, '#ffdda9ad');
    glow.addColorStop(1, '#ffb28700');
    ctx.globalAlpha = light * .88;
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = light * .8;
    ctx.fillStyle = '#fff3cd';
    diamond(ctx, x, y, radius * .17);
  }
  for (const p of particles) {
    if (t > p.life) continue;
    const progress = t / p.life;
    const travel = (1 - Math.exp(-t * 2.6)) / 1.8;
    const px = x + p.dx + p.vx * travel;
    const py = y + p.dy + p.vy * travel + 62 * t * t;
    ctx.globalAlpha = clamp((1 - progress) * 1.32) * clamp(.35 + t * 15);
    ctx.fillStyle = p.color;
    if (p.type === 'petal') {
      ctx.save(); ctx.translate(px, py); ctx.rotate(p.phase + t * p.spin);
      ctx.scale(.55 + .45 * Math.abs(Math.sin(t * 3 + p.phase)), 1);
      drawPetal(ctx, p.size * 1.55); ctx.restore();
    } else if (p.type === 'spark') diamond(ctx, px, py, p.size * .65);
    else { ctx.beginPath(); ctx.arc(px, py, p.size * .49, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
