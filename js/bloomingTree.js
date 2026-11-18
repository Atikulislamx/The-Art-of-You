import { clamp, drawPetal, fitCanvas, lerp, makeLoop, seededRandom, smooth, TAU } from './effects.js';

const ART = { width: 680, height: 590 };
const palette = [
  ['#f7d1ce', '#e59ba4', '#c96981'], ['#f3b6b6', '#d67586', '#a94966'],
  ['#e68d9f', '#bd526f', '#8c2b49'], ['#f9d0b0', '#ef9e88', '#ba5864'],
  ['#ffdeda', '#f2aab5', '#d1798a'], ['#db788f', '#a93a57', '#792b49'],
];

export function pointOnBranch(edge, t) {
  const u = 1 - t;
  return {
    x: u * u * edge.x + 2 * u * t * edge.cx + t * t * edge.tx,
    y: u * u * edge.y + 2 * u * t * edge.cy + t * t * edge.ty,
  };
}
const angleOnBranch = (e, t) => Math.atan2(lerp(e.cy - e.y, e.ty - e.cy, t), lerp(e.cx - e.x, e.tx - e.cx, t));

export function makeTree(seed) {
  const rng = seededRandom(seed);
  const branches = [], blossoms = [], leaves = [];
  function branch(x, y, tx, ty, w, nw, start, bend) {
    const len = Math.hypot(tx - x, ty - y);
    const angle = Math.atan2(ty - y, tx - x);
    const lift = bend ?? (rng() - .5) * len * .66;
    const cx = lerp(x, tx, .45) - Math.sin(angle) * lift;
    const cy = lerp(y, ty, .45) + Math.cos(angle) * lift;
    const edge = { x, y, cx, cy, tx, ty, w, nw, start, end: start + .061 + len / 860, tone: rng() };
    branches.push(edge);
    return edge;
  }
  function spine(parent, t, points) {
    let pos = parent ? pointOnBranch(parent, t) : { x: 344, y: 551 };
    let clock = parent ? lerp(parent.start, parent.end, t) : 0;
    let w = points[0][2];
    return points.map(([x, y, , nw, bend]) => {
      const edge = branch(pos.x, pos.y, x, y, w, nw, clock, bend);
      pos = { x, y }; clock = edge.end; w = nw;
      return edge;
    });
  }
  const trunk = spine(null, 0, [[349, 491, 27, 22, -12], [340, 434, 0, 16, 9], [353, 377, 0, 11, -11], [334, 324, 0, 7, 8], [335, 258, 0, 2, -13], [324, 200, 0, .8, 7]]);
  const left = spine(trunk[1], .79, [[274, 376, 11, 8, -22], [211, 336, 0, 6, 13], [159, 280, 0, 4, -15], [139, 220, 0, 2, 11], [158, 161, 0, .85, -9]]);
  const leftLobe = spine(left[2], .64, [[194, 229, 4.4, 3.4, 13], [196, 165, 0, 2.3, 10], [223, 114, 0, 1.3, -12], [269, 103, 0, .72, -9]]);
  const leftLow = spine(left[0], .86, [[235, 322, 5.9, 3.8, 14], [259, 271, 0, 2.5, 9], [246, 219, 0, 1.3, -13], [269, 163, 0, .65, -8]]);
  const leftEdge = spine(left[2], .83, [[119, 243, 2.8, 1.6, -9], [108, 192, 0, .65, 6]]);
  const right = spine(trunk[2], .59, [[402, 393, 10, 7.7, 8], [464, 343, 0, 5.8, -11], [516, 296, 0, 3.6, 15], [550, 235, 0, 2.2, 12], [544, 175, 0, .75, 8]]);
  const rightLobe = spine(right[2], .74, [[501, 263, 4.3, 3.3, -9], [487, 204, 0, 2.5, 13], [477, 148, 0, 1.9, -9], [445, 105, 0, .75, 12], [403, 107, 0, .68, 7]]);
  const rightLow = spine(right[0], .83, [[418, 345, 5.5, 3.8, 10], [413, 284, 0, 2.7, -10], [434, 238, 0, 1.6, 8], [421, 182, 0, .7, 11]]);
  const rightEdge = spine(right[3], .34, [[571, 257, 2.7, 1.5, 5], [587, 210, 0, .65, 8]]);
  const center = spine(trunk[3], .62, [[375, 299, 4, 3, -10], [387, 240, 0, 1.5, 11], [368, 187, 0, .75, 13]]);
  const roots = [spine(trunk[0], .19, [[315, 542, 10, 4, 7], [283, 554, 0, .6, -5]]), spine(trunk[0], .045, [[370, 546, 13, 5, -5], [395, 552, 0, .6, -5]])];
  for (const e of roots.flat()) { e.start *= .7; e.end *= .65; }

  function flower(x, y, when, radius) {
    blossoms.push({ x, y, when, size: radius, tint: Math.floor(rng() * palette.length), turn: rng() * TAU, alpha: .66 + rng() * .34 });
  }
  function cluster(e, t, quantity, spread, size) {
    const { x, y } = pointOnBranch(e, t), when = lerp(e.start, e.end, t);
    for (let j = 0; j < quantity; j++) {
      const direction = rng() * TAU, radius = spread * Math.sqrt(rng());
      flower(x + Math.cos(direction) * radius, y + Math.sin(direction) * radius * .79, when + rng() * .11, size * (.46 + rng() ** .75 * .83));
    }
  }
  function sprout(parent, t, side, depth, length) {
    const { x, y } = pointOnBranch(parent, t);
    const base = angleOnBranch(parent, t);
    const angle = clamp(base + side * (.45 + rng() * .84), -3.31, .06);
    const tx = clamp(x + Math.cos(angle) * length, 85, 611);
    const ty = clamp(y + Math.sin(angle) * length, 65, 412);
    const w = Math.max(.76, Math.min(2.75, lerp(parent.w, parent.nw, t) * (.43 + rng() * .21)));
    const edge = branch(x, y, tx, ty, w, Math.max(.42, w * .35), lerp(parent.start, parent.end, t), length * (rng() - .44) * .57);
    const radius = ty < 280 ? 11.2 : 9;
    if (depth) {
      sprout(edge, .62 + rng() * .28, -side, depth - 1, length * (.49 + rng() * .21));
      if (rng() > .44) sprout(edge, .84, side, depth - 1, length * (.42 + rng() * .17));
    }
    cluster(edge, 1, depth ? 3 : 4 + Math.floor(rng() * 4), radius * (1.13 + rng() * .83), 7 + rng() * 4);
    if (rng() > .31) cluster(edge, .68, 2 + Math.floor(rng() * 3), radius * .93, 6 + rng() * 5);
    if (rng() > .28) leaves.push({ ...pointOnBranch(edge, .73), when: lerp(edge.start, edge.end, .77), turn: angle + side * .89, size: 5 + rng() * 6, tint: rng() });
  }

  for (const edge of [...trunk.slice(3), ...left, ...leftLobe, ...leftLow, ...leftEdge, ...right, ...rightLobe, ...rightLow, ...rightEdge, ...center]) {
    const tip = edge.ty < 180;
    const length = (tip ? 29 : 42) * (.82 + rng() * .47);
    sprout(edge, .48 + rng() * .19, rng() < .5 ? -1 : 1, edge.ty < 330 ? 1 : 0, length);
    if (edge.ty < 323) sprout(edge, .8 + rng() * .15, rng() < .51 ? 1 : -1, 1, length * .84);
    if (edge.ty < 357) cluster(edge, .95, tip ? 6 : 4, tip ? 20 : 14, 9);
  }
  // Buds along the younger portions of the small boughs, not along the old trunk.
  for (const edge of [...leftLobe, ...rightLobe, ...leftLow.slice(2), ...rightLow.slice(2)]) cluster(edge, .54, 8, 19 + rng() * 6, 9 + rng() * 3);
  branches.sort((a, b) => a.start - b.start);
  blossoms.sort((a, b) => b.size - a.size);
  const duration = Math.max(...branches.map(b => b.end), ...blossoms.map(b => b.when)) + .20;
  return { branches, blossoms, leaves, duration };
}

function paintBranch(ctx, edge, progress) {
  if (progress <= 0) return;
  const steps = Math.max(2, Math.ceil(progress * 10));
  const shape = (factor, reverse) => {
    for (let i = reverse ? steps : 0; reverse ? i >= 0 : i <= steps; i += reverse ? -1 : 1) {
      const t = progress * i / steps;
      const p = pointOnBranch(edge, t), a = angleOnBranch(edge, t) + Math.PI / 2;
      const r = lerp(edge.w, edge.nw, t) * factor;
      if (i === 0 && !reverse) ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      else ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    }
  };
  ctx.fillStyle = edge.w > 8 ? (edge.tone > .45 ? '#724a44' : '#69403f') : (edge.tone > .55 ? '#8b5653' : '#79484b');
  ctx.beginPath(); shape(.53, false); shape(-.49, true); ctx.closePath(); ctx.fill();
  // Rounded joints join differently angled ribbons without a gap in their bark.
  const tip = pointOnBranch(edge, progress);
  ctx.beginPath(); ctx.arc(tip.x, tip.y, lerp(edge.w, edge.nw, progress) * .49, 0, TAU); ctx.fill();
  if (edge.w > 3.2) {
    ctx.fillStyle = edge.w > 8 ? '#b5816b82' : '#be8c716c';
    ctx.beginPath(); shape(.48, false); shape(.21, true); ctx.closePath(); ctx.fill();
  }
  if (edge.w > 10 && progress > .13) {
    ctx.strokeStyle = '#4f29353d'; ctx.lineWidth = .76;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const t = lerp(.08, Math.min(progress, .94), i / 8);
      const p = pointOnBranch(edge, t), a = angleOnBranch(edge, t) + Math.PI / 2;
      const v = lerp(edge.w, edge.nw, t) * (.21 + Math.sin(t * 9 + edge.tone) * .15);
      if (i === 0) ctx.moveTo(p.x - Math.cos(a) * v, p.y - Math.sin(a) * v);
      else ctx.lineTo(p.x - Math.cos(a) * v, p.y - Math.sin(a) * v);
    }
    ctx.stroke();
  }
}

function makeFlowerSprites() {
  return palette.map(([light, base, dark], i) => {
    const image = document.createElement('canvas');
    image.width = image.height = 64;
    const c = image.getContext('2d');
    if (!c) return image;
    c.translate(32, 32);
    c.fillStyle = `${dark}34`;
    for (let j = 0; j < 5; j++) {
      c.rotate(TAU / 5);
      c.beginPath(); c.ellipse(1.5, -14, 11.5, 13.9, -.22, 0, TAU); c.fill();
    }
    const petal = c.createLinearGradient(0, 2, 0, -24);
    petal.addColorStop(0, dark); petal.addColorStop(.53, base); petal.addColorStop(1, light);
    for (let j = 0; j < 5; j++) {
      c.rotate(TAU / 5 + (j % 2 ? .045 : -.045));
      c.fillStyle = petal;
      c.beginPath(); c.moveTo(0, 4);
      c.bezierCurveTo(-12, -5, -15, -18, -5, -23);
      c.bezierCurveTo(-1, -22, 3, -25, 7, -22);
      c.bezierCurveTo(16, -16, 12, -8, 0, 4); c.fill();
      c.strokeStyle = `${light}a8`; c.lineWidth = .75;
      c.beginPath(); c.moveTo(0, -.5); c.quadraticCurveTo(-5, -7, -4, -15); c.stroke();
    }
    c.rotate(i * .4);
    c.fillStyle = '#a15049'; c.beginPath(); c.arc(0, 0, 3.65, 0, TAU); c.fill();
    c.fillStyle = '#e8bc82';
    for (let j = 0; j < 5; j++) {
      const a = j / 5 * TAU;
      c.beginPath(); c.arc(Math.cos(a) * 3.6, Math.sin(a) * 3.6, .94, 0, TAU); c.fill();
    }
    return image;
  });
}
let flowerSprites;

function drawTree(ctx, w, h, tree, t) {
  const s = Math.min(w / ART.width, h / ART.height);
  ctx.save(); ctx.translate((w - ART.width * s) / 2, (h - ART.height * s) / 2); ctx.scale(s, s);
  ctx.save(); ctx.translate(344, 555); ctx.scale(1, .128);
  const shadow = ctx.createRadialGradient(0, 0, 0, 0, 0, 137);
  shadow.addColorStop(0, '#87534b42'); shadow.addColorStop(.48, '#98655525'); shadow.addColorStop(1, '#98655500');
  ctx.fillStyle = shadow; ctx.fillRect(-138, -138, 276, 276); ctx.restore();
  for (const edge of tree.branches) {
    if (edge.start > t) break;
    paintBranch(ctx, edge, smooth((t - edge.start) / (edge.end - edge.start)));
  }
  for (const leaf of tree.leaves) {
    const growth = smooth((t - leaf.when) / .19);
    if (!growth) continue;
    ctx.save(); ctx.translate(leaf.x, leaf.y); ctx.rotate(leaf.turn); ctx.scale(growth, growth);
    ctx.fillStyle = leaf.tint > .42 ? '#a3765c9a' : '#929071a2';
    const r = leaf.size;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * .29, -r * .48, r, 0); ctx.quadraticCurveTo(r * .41, r * .36, 0, 0); ctx.fill(); ctx.restore();
  }
  for (const bloom of tree.blossoms) {
    const growth = smooth((t - bloom.when) / .20);
    if (!growth) continue;
    const size = bloom.size * growth;
    ctx.save(); ctx.translate(bloom.x, bloom.y); ctx.rotate(bloom.turn); ctx.globalAlpha = growth * bloom.alpha;
    ctx.drawImage(flowerSprites[bloom.tint], -size, -size, size * 2, size * 2); ctx.restore();
  }
  ctx.restore();
}

export function mountTree(stage, config, motion, signal, finale = false) {
  const { animation, timing, features } = config;
  const tree = makeTree(animation.treeSeed);
  const random = seededRandom(1771);
  const petals = Array.from({ length: features.ambientParticles ? animation.treePetals : 0 }, () => ({
    x: random(), y: random(), size: 2.2 + random() ** 1.7 * 4.9, lift: .031 + random() * .04,
    phase: random() * TAU, spin: (random() - .5) * .93, tint: palette[Math.floor(random() * palette.length)][1],
  }));
  const duration = Math.max(0, Number(timing.treeGrowth) || 0);
  let age = finale || motion.matches ? duration : 0, drift = 0, cached = false;
  const still = document.createElement('canvas');
  const loop = makeLoop((_, dt) => {
    const { ctx, w, h, dpr } = surface;
    if (!ctx) { stage.classList.add('no-canvas'); return false; }
    if (motion.matches) age = duration;
    else { age += dt; drift += dt / 1000; }
    const progress = duration ? clamp(age / duration) : 1;
    ctx.clearRect(0, 0, w, h);
    flowerSprites ??= makeFlowerSprites();
    if (progress < 1) drawTree(ctx, w, h, tree, progress * tree.duration);
    else {
      if (!cached) {
        still.width = Math.round(w * dpr); still.height = Math.round(h * dpr);
        const frozen = still.getContext('2d');
        if (frozen) {
          frozen.setTransform(still.width / w, 0, 0, still.height / h, 0, 0);
          drawTree(frozen, w, h, tree, tree.duration);
          cached = true;
        }
      }
      if (cached) ctx.drawImage(still, 0, 0, w, h);
      else drawTree(ctx, w, h, tree, tree.duration);
    }
    if (!motion.matches && progress > .44) for (const p of petals) {
      const y = (p.y + drift * p.lift) % 1;
      const x = ((p.x - drift * .024 + Math.sin(p.phase + drift * .69) * .071) % 1 + 1) % 1;
      const scale = clamp(Math.min(w, h) / 470, .63, 1.28);
      ctx.save(); ctx.translate(x * w, y * h); ctx.rotate(p.phase + drift * p.spin);
      ctx.scale(.76 + Math.cos(p.phase + drift * 2.3) * .26, 1);
      ctx.globalAlpha = .58 * smooth((progress - .44) / .26) * clamp(Math.min(y, 1 - y, x, 1 - x) * 10);
      ctx.fillStyle = p.tint; drawPetal(ctx, p.size * scale); ctx.restore();
    }
    return !motion.matches && (progress < 1 || petals.length > 0);
  });
  const surface = fitCanvas(stage, stage.querySelector('canvas'), animation.maxDpr, () => { cached = false; loop.start(); });
  motion.addEventListener('change', () => loop.start(), { signal });
  signal.addEventListener('abort', () => { loop.stop(); surface.dispose(); still.width = still.height = 0; }, { once: true });
}
