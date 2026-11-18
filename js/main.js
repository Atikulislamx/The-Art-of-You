import { config } from './config.js';
import { SceneManager } from './sceneManager.js';
import { mountBow } from './bowInteraction.js';
import { mountTree } from './bloomingTree.js';
import { MusicController } from './musicController.js';
import { fitCanvas, makeLoop, mountWish } from './effects.js';
import { drawHeartBurst, makeHeartBurst } from './heartParticles.js';

const site = document.getElementById('keepsake');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const status = site.querySelector('[data-story-status]');
const announce = message => { status.textContent = message; };
const personalize = value => String(value ?? '').replaceAll('{name}', config.recipient.trim() || 'you');
const assign = (selector, value) => site.querySelectorAll(selector).forEach(node => { node.textContent = personalize(value); });

for (const [key, value] of Object.entries(config.theme)) site.style.setProperty(`--${key}`, value);
for (const [key, value] of Object.entries(config.timing.wish)) site.style.setProperty(`--wish-${key}`, `${value}ms`);
for (const [key, fraction] of Object.entries({ script: .06, title: .37, copy: .64, action: .87 })) {
  site.style.setProperty(`--bloom-${key}`, `${Math.round(config.timing.treeGrowth * fraction)}ms`);
}
assign('[data-birthday]', config.birthdayTitle);
assign('[data-wish-subtitle]', config.wishSubtitle);
assign('[data-greeting]', config.letter.greeting);
assign('[data-signoff]', config.letter.closing);
assign('[data-signature]', config.letter.signature);
assign('[data-secret-text]', config.secret);
assign('[data-finale-line]', config.finale.firstLine);
assign('[data-finale-accent]', config.finale.accentLine);
assign('[data-finale-birthday]', config.finale.birthday);
const letter = site.querySelector('[data-letter]');
for (const paragraph of config.letter.paragraphs) {
  const p = document.createElement('p'); p.textContent = personalize(paragraph); letter.append(p);
}
if (/^\d{4}-\d{2}-\d{2}$/.test(config.birthdayDate)) {
  const parsed = new Date(`${config.birthdayDate}T12:00:00Z`);
  if (!Number.isNaN(+parsed) && parsed.toISOString().slice(0, 10) === config.birthdayDate) {
    const time = site.querySelector('[data-date]');
    time.dateTime = config.birthdayDate;
    time.textContent = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long', timeZone: 'UTC' }).format(parsed);
    time.hidden = false;
  }
}

const sound = site.querySelector('[data-sound]');
const music = new MusicController(config.audio, active => {
  sound.setAttribute('aria-pressed', String(active));
  sound.querySelector('use').setAttribute('href', active ? '#icon-sound-on' : '#icon-sound-off');
}, announce);
sound.hidden = !config.audio.enabled || !config.audio.source;
sound.addEventListener('click', () => music.toggle());
let secretOpened = false;

function secretScene(section, signal) {
  const stage = section.querySelector('[data-secret-stage]');
  const seal = section.querySelector('[data-seal-stage]');
  const button = section.querySelector('[data-secret-trigger]');
  const message = section.querySelector('[data-secret-message]');
  const next = section.querySelector('[data-next]');
  function render() {
    button.setAttribute('aria-expanded', String(secretOpened));
    seal.hidden = secretOpened;
    message.hidden = !secretOpened;
    next.hidden = !secretOpened;
  }
  render();
  button.addEventListener('click', () => {
    const rect = stage.getBoundingClientRect(), trigger = button.getBoundingClientRect();
    const x = trigger.left - rect.left + trigger.width / 2, y = trigger.top - rect.top + trigger.height / 2;
    secretOpened = true;
    render();
    const text = message.querySelector('[data-secret-text]');
    text.focus({ preventScroll: true });
    const textBounds = text.getBoundingClientRect();
    if (textBounds.top < 0 || textBounds.bottom > window.innerHeight) text.scrollIntoView({ block: 'nearest' });
    music.accent('secret');
    if (motion.matches || !config.features.ambientParticles) return;
    const burst = makeHeartBurst(x, y, 108, 53);
    const canvas = section.querySelector('[data-secret-canvas]');
    const surface = fitCanvas(stage, canvas, config.animation.maxDpr);
    const start = performance.now();
    const loop = makeLoop(now => {
      const { ctx, w, h } = surface;
      if (!ctx) return false;
      ctx.clearRect(0, 0, w, h);
      const elapsed = now - start;
      if (elapsed > 1190 || motion.matches) return false;
      drawHeartBurst(ctx, burst, elapsed);
      return true;
    });
    loop.start();
    signal.addEventListener('abort', () => {
      loop.stop(); surface.ctx?.clearRect(0, 0, surface.w, surface.h); surface.dispose();
    }, { once: true });
  }, { signal });
}

const manager = new SceneManager(site, {
  timing: config.timing,
  motion,
  mounts: {
    heart: (section, signal) => mountBow(section, config, motion, signal, {
      release: () => { music.gesture(); music.accent('release'); announce(''); },
      impact: () => music.accent('impact'),
      complete: () => manager.advance('wish'),
      hint: announce,
    }),
    wish: (section, signal) => mountWish(section.querySelector('[data-wish-plate]'), config, motion, signal),
    bloom: (section, signal) => {
      mountTree(section.querySelector('[data-tree-stage]'), config, motion, signal);
      music.accent('bloom');
    },
    secret: secretScene,
    finale: (section, signal) => {
      section.querySelector('[data-share-status]').textContent = '';
      section.querySelector('[data-share-field]').hidden = true;
      mountTree(section.querySelector('[data-tree-stage]'), config, motion, signal, true);
    },
  },
  onEnter: name => {
    const background = name === 'wish' ? '#3a1624' : config.theme.ivory;
    document.querySelector('meta[name="theme-color"]').content = background;
    announce('');
  },
});

site.querySelector('[data-home]').addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (manager.current === 'heart') site.querySelector('#heart-title').focus({ preventScroll: true });
  else manager.go('heart');
});
site.querySelector('[data-replay]').addEventListener('click', () => {
  if (manager.go('heart', { reset: true })) {
    secretOpened = false;
    music.pause(true);
  }
});

const share = site.querySelector('[data-share]');
share.hidden = !config.features.share;
share.addEventListener('click', async () => {
  const link = new URL(location.href);
  link.search = ''; link.hash = ''; link.pathname = link.pathname.replace(/index\.html$/, '');
  const url = link.href;
  const result = site.querySelector('[data-share-status]');
  const field = site.querySelector('[data-share-field]');
  result.textContent = '';
  field.hidden = true;
  const payload = { title: 'The Art of You', text: 'Some feelings are art. Some people are the reason.', url };
  if ('share' in navigator) {
    try {
      if (!navigator.canShare || navigator.canShare(payload)) { await navigator.share(payload); return; }
    } catch (error) { if (error?.name === 'AbortError') return; }
  }
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(url);
    result.textContent = 'Link copied.';
  } catch {
    const input = field.querySelector('input');
    input.value = url;
    field.hidden = false;
    input.focus(); input.select();
  }
});
