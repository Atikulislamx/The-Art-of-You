import { clamp, diamond, fitCanvas, lerp, makeLoop, seededRandom, smooth, TAU } from './effects.js';
import { drawHeartBurst, makeHeartBurst } from './heartParticles.js';

// Coordinates live in the artwork, not in the viewport; resize and DPR never change the aim.
export function bowGeometry(w, h) {
  const target = { x: w * .63, y: h * .41 };
  const origin = { x: w * .275, y: h * .68 };
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const angle = Math.atan2(dy, dx);
  return { origin, target, angle, cos: Math.cos(angle), sin: Math.sin(angle), length: Math.hypot(dx, dy), span: clamp(Math.min(w, h) * .158, 34, 96) };
}

export function localToStage(g, x, y) {
  return { x: g.origin.x + x * g.cos - y * g.sin, y: g.origin.y + x * g.sin + y * g.cos };
}

export function measurePull(g, dx, dy) {
  const pull = clamp(-dx * g.cos - dy * g.sin, 0, g.span * .93);
  const side = clamp(-dx * g.sin + dy * g.cos, -g.span * .53, g.span * .53);
  return { pull, side };
}

// An eased cubic path keeps the arrow responsive to aim without asking for precise motor control.
export function arrowFlight(start, end, angle, aim, progress) {
  const t = clamp(progress), u = 1 - t;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const a = { x: start.x + Math.cos(angle + aim) * distance * .39, y: start.y + Math.sin(angle + aim) * distance * .39 };
  const b = { x: lerp(start.x, end.x, .74), y: lerp(start.y, end.y, .74) - Math.abs(aim) * distance * .10 };
  const coordinate = key => u ** 3 * start[key] + 3 * u * u * t * a[key] + 3 * u * t * t * b[key] + t ** 3 * end[key];
  const tangent = key => 3 * (u * u * (a[key] - start[key]) + 2 * u * t * (b[key] - a[key]) + t * t * (end[key] - b[key]));
  return { x: coordinate('x'), y: coordinate('y'), angle: Math.atan2(tangent('y'), tangent('x')) };
}

export function mountBow(scene, config, motion, signal, events) {
  const stage = scene.querySelector('[data-bow-stage]');
  const launchButton = scene.querySelector('[data-launch]');
  const grip = stage.querySelector('[data-bow-grip]');
  const mark = stage.querySelector('.wax-heart');
  const label = stage.querySelector('[data-pull-label]');
  const svg = stage.querySelector('[data-bow-svg]');
  const bow = svg.querySelector('[data-bow-rig]');
  const arrow = svg.querySelector('[data-arrow-rig]');
  const parts = Object.fromEntries(['aim', 'string', 'body', 'gold', 'glint', 'wrap', 'binding', 'ends'].map(name => [name, bow.querySelector(`[data-bow-${name}]`)]));
  const arrowParts = ['shaft', 'inlay', 'feather', 'tip'].map(name => arrow.querySelector(`[data-arrow-${name}]`));
  const setPath = (element, d) => element.setAttribute('d', d);
  const { animation, timing, features } = config;
  const rand = seededRandom(821);
  const motes = Array.from({ length: 17 }, () => ({ x: rand(), y: rand(), phase: rand() * TAU, size: .65 + rand() * 1.25 }));

  let geometry, frame, drag = null, shot = null, burst = null, impactAt = null;
  let pull = 0, side = 0, aimPull = 0, aimSide = 0, clock = 0, completed = false, lastGesture = -Infinity;
  let hintTimer, lastPose = '';
  const degrees = angle => angle * 180 / Math.PI;
  const bob = () => motion.matches ? 0 : Math.sin(clock * 1.47) * animation.heartFloat * clamp(frame?.w / 580 || 1, .55, 1);
  const nock = () => ({ x: -geometry.span * .49 - pull, y: side * .47 });
  const arrowSize = () => geometry.span * 1.67;
  const aim = () => -side / (geometry.span * 2.25);

  function placeArrow(x, y, angle) {
    arrow.setAttribute('transform', `translate(${x} ${y}) rotate(${degrees(angle)})`);
  }

  function drawBow() {
    const { span: s, origin, angle, length } = geometry;
    const tension = pull / s;
    const x = -s * (.49 + tension * .17);
    const y = s * (1 - tension * .064);
    const n = nock();
    const d = `M ${x} ${-y} C ${x + s * .62} ${-y - s * .12}, ${s * .25} ${-s * .61}, ${s * .15} ${-s * .43} ` +
      `S ${s * .19} ${-s * .16}, ${s * .22} 0 C ${s * .25} ${s * .18}, ${s * .08} ${s * .26}, ${s * .15} ${s * .45} ` +
      `S ${x + s * .59} ${y + s * .12}, ${x} ${y}`;
    bow.setAttribute('transform', `translate(${origin.x} ${origin.y}) rotate(${degrees(angle)})`);
    setPath(parts.aim, `M ${s * 1.22} ${s * .023} L ${length - s * .63} ${bob() * geometry.cos}`);
    parts.aim.setAttribute('opacity', shot ? '0' : String(.39 + tension * .43));
    setPath(parts.string, `M ${x} ${-y} L ${shot ? x : n.x} ${shot ? 0 : n.y} L ${x} ${y}`);
    for (const [name, weight] of [['body', .073], ['gold', .053], ['glint', .014]]) {
      setPath(parts[name], d);
      parts[name].setAttribute('stroke-width', String(clamp(s * weight, 1, 6.5)));
    }
    setPath(parts.wrap, `M ${s * .16} ${-s * .148} Q ${s * .27} 0 ${s * .16} ${s * .148}`);
    parts.wrap.setAttribute('stroke-width', String(clamp(s * .118, 4.4, 9.4)));
    setPath(parts.binding, [-.12, -.064, -.006, .052, .11].map((f, i) => `M ${s * (i === 2 ? .147 : .126)} ${s * f} l ${s * .124} ${s * .031}`).join(' '));
    setPath(parts.ends, `M ${x + s * .02} ${-y} l ${s * .058} ${-s * .014} M ${x + s * .008} ${y} l ${s * .058} ${s * .014}`);
    if (!shot) {
      const p = localToStage(geometry, n.x, n.y);
      grip.style.left = `${p.x}px`; grip.style.top = `${p.y}px`;
      placeArrow(p.x, p.y, angle + aim());
    }
  }

  function buildArrow() {
    const len = arrowSize(), tip = clamp(geometry.span * .17, 7, 13), feather = clamp(geometry.span * .22, 9, 19);
    setPath(arrowParts[0], `M 0 0 H ${len - tip * .63}`);
    setPath(arrowParts[1], `M 0 -.29 H ${len - tip * .63}`);
    setPath(arrowParts[2], `M 2 -.35 Q 7 ${-feather * .35} ${feather + 2} ${-feather * .27} L ${feather + 7} -.15 L ${feather + 2} ${feather * .27} Q 8 ${feather * .36} 2 .35Z`);
    setPath(arrowParts[3], `M ${len} 0 L ${len - tip} ${-tip * .36} ${len - tip * .78} 0 ${len - tip} ${tip * .36}Z`);
  }

  function impact(now) {
    if (impactAt !== null || !geometry) return;
    impactAt = now;
    const size = Math.min(frame.w * .44, 340);
    const count = motion.matches ? 0 : Math.round(animation.heartParticles * clamp(frame.w / 450, .55, 1));
    burst = makeHeartBurst(geometry.target.x, geometry.target.y + bob(), size, count);
    arrow.style.opacity = '0';
    label.textContent = 'A little wish, released';
    events.impact?.();
  }

  const loop = makeLoop((now, dt) => {
    if (!frame || !geometry || completed) return false;
    const { ctx, w, h } = frame;
    if (!motion.matches) clock += dt / 1000;
    if (!shot) {
      const response = motion.matches ? 1 : 1 - Math.exp(-dt * (drag ? .03 : .017));
      pull = lerp(pull, aimPull, response); side = lerp(side, aimSide, response);
      if (Math.abs(pull - aimPull) < .06) pull = aimPull;
      if (Math.abs(side - aimSide) < .06) side = aimSide;
    }
    const pose = `${pull.toFixed(2)}:${side.toFixed(2)}:${Boolean(shot)}`;
    if (pose !== lastPose) { drawBow(); lastPose = pose; }
    ctx?.clearRect(0, 0, w, h);
    if (ctx && features.ambientParticles && !motion.matches) {
      for (const m of motes) {
        const x = w * m.x + Math.sin(clock * .38 + m.phase) * 10;
        const y = h * m.y + Math.cos(clock * .52 + m.phase) * 17;
        ctx.globalAlpha = .22 + (1 + Math.sin(clock * 1.05 + m.phase)) * .19;
        ctx.fillStyle = '#fff4d3';
        if (m.size > 1.45) diamond(ctx, x, y, m.size);
        else { ctx.beginPath(); ctx.arc(x, y, m.size, 0, TAU); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
    if (shot && impactAt === null) {
      const t = motion.matches || shot.resize ? 1 : clamp((now - shot.started) / shot.duration);
      const target = { x: geometry.target.x, y: geometry.target.y + bob() + 2 };
      const p = arrowFlight(shot.start, target, geometry.angle, shot.aim, t ** .84);
      const len = arrowSize();
      placeArrow(p.x - Math.cos(p.angle) * len, p.y - Math.sin(p.angle) * len, p.angle);
      if (t >= 1) impact(now);
    }
    if (impactAt !== null) {
      const elapsed = now - impactAt;
      const k = motion.matches ? 1 : smooth(elapsed / 285);
      mark.style.opacity = String(1 - k);
      mark.style.transform = `translate(-50%, -50%) translateY(${bob()}px) scale(${1 + k * .075}) rotate(${k * 3}deg)`;
      if (!motion.matches && burst) drawHeartBurst(ctx, burst, elapsed);
      if (elapsed >= (motion.matches ? 25 : timing.heartBurst)) {
        completed = true;
        events.complete();
        return false;
      }
    } else {
      mark.style.transform = `translate(-50%, -50%) translateY(${bob()}px)`;
    }
    return !motion.matches || !!shot;
  });

  const surface = fitCanvas(stage, stage.querySelector('[data-bow-canvas]'), animation.maxDpr, current => {
    frame = current;
    geometry = bowGeometry(frame.w, frame.h);
    svg.setAttribute('viewBox', `0 0 ${frame.w} ${frame.h}`);
    buildArrow();
    if (shot && impactAt === null) shot.resize = true;
    drawBow();
    loop.start();
  });

  function clearHint() { clearTimeout(hintTimer); }
  function fire(force = .48) {
    if (shot || completed || signal.aborted) return;
    events.release?.(); // Called synchronously in the visitor's gesture, before an animation frame.
    if (!geometry) { events.complete(); return; }
    clearHint();
    const n = nock();
    const angle = aim();
    const start = localToStage(geometry, n.x + Math.cos(angle) * arrowSize(), n.y + Math.sin(angle) * arrowSize());
    shot = { start, aim: angle, started: performance.now(), duration: lerp(570, 365, clamp(force)) };
    drag = null; aimPull = aimSide = pull = side = 0;
    stage.classList.remove('is-drawing');
    stage.classList.add('is-releasing');
    grip.disabled = true;
    launchButton.disabled = true;
    label.textContent = 'Make a wish';
    loop.start();
  }

  function resetDrag() {
    drag = null; aimPull = aimSide = 0;
    stage.classList.remove('is-drawing');
    loop.start();
  }

  function startDrag(event) {
    if (!geometry || !event.isPrimary || event.button !== 0 || shot || drag) return;
    const rect = stage.getBoundingClientRect();
    const n = nock();
    const p = localToStage(geometry, n.x, n.y);
    const onGrip = grip.contains(event.target);
    const near = Math.hypot(event.clientX - rect.left - stage.clientLeft - p.x, event.clientY - rect.top - stage.clientTop - p.y) < geometry.span * .81;
    if (!onGrip && (event.pointerType !== 'mouse' || !near)) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    clearHint();
    label.textContent = 'Pull & release';
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, onGrip };
    try { stage.setPointerCapture(event.pointerId); } catch { /* optional on older browsers */ }
    stage.classList.add('is-drawing');
    loop.start();
  }

  function moveDrag(event) {
    if (drag?.id !== event.pointerId) return;
    const p = measurePull(geometry, event.clientX - drag.x, event.clientY - drag.y);
    aimPull = p.pull; aimSide = p.side;
    label.textContent = aimPull >= Math.max(10, geometry.span * .19) ? 'Let go' : 'Pull & release';
    loop.start();
  }

  function endDrag(event) {
    if (drag?.id !== event.pointerId) return;
    moveDrag(event);
    const delta = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    const tapped = drag.onGrip && delta < 7;
    const fired = aimPull >= Math.max(10, geometry.span * .19);
    lastGesture = performance.now();
    if (fired || tapped) {
      pull = aimPull; side = aimSide;
      fire(tapped ? .5 : aimPull / (geometry.span * .93));
      return;
    }
    resetDrag();
    label.textContent = 'Pull back, then let go';
    events.hint?.('Pull the bowstring back away from the heart, or choose Begin the story.');
    hintTimer = setTimeout(() => { label.textContent = 'Pull & release'; }, 2200);
  }

  launchButton.hidden = false; launchButton.disabled = false;
  grip.hidden = false; grip.disabled = false;
  stage.dataset.ready = '';
  launchButton.addEventListener('click', () => fire(), { signal });
  grip.addEventListener('click', event => { if (!event.detail || performance.now() - lastGesture > 550) fire(); }, { signal });
  stage.addEventListener('pointerdown', startDrag, { signal });
  stage.addEventListener('pointermove', moveDrag, { signal });
  stage.addEventListener('pointerup', endDrag, { signal });
  for (const type of ['pointercancel', 'lostpointercapture']) stage.addEventListener(type, event => {
    if (drag?.id === event.pointerId) { resetDrag(); label.textContent = 'Pull & release'; }
  }, { signal });
  motion.addEventListener('change', () => loop.start(), { signal });
  signal.addEventListener('abort', () => {
    loop.stop(); surface.dispose(); clearHint();
    if (drag && stage.hasPointerCapture(drag.id)) stage.releasePointerCapture(drag.id);
    stage.classList.remove('is-drawing', 'is-releasing');
    delete stage.dataset.ready;
    mark.style.removeProperty('opacity'); mark.style.removeProperty('transform');
    arrow.style.removeProperty('opacity'); label.textContent = 'Pull & release';
  }, { once: true });
}
