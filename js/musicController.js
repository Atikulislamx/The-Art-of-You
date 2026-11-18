import { clamp } from './effects.js';

const preferenceKey = 'the-art-of-you:sound';

export class MusicController {
  constructor(settings, onUpdate, announce) {
    this.settings = settings;
    this.onUpdate = onUpdate;
    this.announce = announce;
    this.active = false;
    this.level = 0;
    this.version = 0;
    this.fadeFrame = 0;
    try {
      const value = localStorage.getItem(preferenceKey);
      this.preference = value === 'on' ? true : value === 'off' ? false : null;
    } catch { this.preference = null; }
  }

  remember(value) {
    this.preference = value;
    try { localStorage.setItem(preferenceKey, value ? 'on' : 'off'); } catch { /* private preview */ }
  }

  gesture() {
    if (this.settings.startOnFirstRelease && this.preference !== false) this.play();
  }

  toggle() {
    this.remember(!this.active);
    if (this.active) this.pause();
    else this.play(true);
  }

  prepare() {
    if (this.track) return;
    const audio = new Audio();
    audio.preload = 'none';
    audio.loop = this.settings.loop;
    audio.src = this.settings.source;
    this.track = audio;
    if (!audio.loop) audio.addEventListener('ended', () => this.pause());
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.gain.value = 0;
        const input = this.context.createMediaElementSource(audio);
        input.connect(this.gain); this.gain.connect(this.context.destination);
      }
    } catch { this.gain = null; /* Soft fallback to the media element. */ }
  }

  setLevel(value) {
    this.level = clamp(value);
    if (this.gain) this.gain.gain.value = this.level;
    else if (this.track) {
      try { this.track.volume = this.level; } catch { /* read-only on some mobile browsers */ }
    }
  }

  fade(target, duration, complete) {
    cancelAnimationFrame(this.fadeFrame);
    const start = performance.now(), from = this.level;
    const step = now => {
      const t = clamp((now - start) / Math.max(1, duration));
      this.setLevel(from + (target - from) * (t * t * (3 - 2 * t)));
      if (t < 1) this.fadeFrame = requestAnimationFrame(step);
      else { this.fadeFrame = 0; complete?.(); }
    };
    if (!duration) { this.setLevel(target); complete?.(); }
    else this.fadeFrame = requestAnimationFrame(step);
  }

  play(manual = false) {
    if (this.active || !this.settings.enabled || !this.settings.source) return;
    this.prepare();
    const version = ++this.version;
    this.active = true;
    this.onUpdate(true);
    cancelAnimationFrame(this.fadeFrame);
    this.setLevel(this.level);
    this.context?.resume().catch(() => {});
    // Do not defer play(): Safari and embedded previews need it inside the gesture.
    const fail = () => {
      if (this.version !== version) return;
      this.active = false;
      this.onUpdate(false);
      this.setLevel(0);
      this.track.pause();
      if (manual) this.announce('Sound isn’t available here. You can still read the story.');
    };
    try {
      Promise.resolve(this.track.play()).then(() => {
        if (this.version === version) this.fade(this.settings.volume, this.settings.fadeIn);
      }, fail);
    } catch { fail(); }
  }

  pause(reset = false) {
    const version = ++this.version;
    this.active = false;
    this.onUpdate(false);
    if (!this.track) return;
    this.fade(0, this.settings.fadeOut, () => {
      if (this.version !== version) return;
      this.track.pause();
      if (reset && this.track.readyState) this.track.currentTime = 0;
    });
  }

  accent(kind) {
    const ctx = this.context;
    const level = clamp(Number(this.settings.volume) || 0);
    if (!ctx || !this.active || !this.settings.soundEffects || !level || ctx.state === 'closed') return;
    const notes = {
      release: [[220, 0, .12, .035], [330, .021, .13, .024]],
      impact: [[587.33, 0, .37, .032], [880, .035, .42, .021], [1174.66, .067, .51, .014]],
      bloom: [[440, 0, .6, .016], [659.25, .16, .62, .014], [880, .35, .64, .01]],
      secret: [[739.99, 0, .55, .018], [987.77, .07, .63, .013]],
    }[kind] ?? [];
    for (const [pitch, delay, life, volume] of notes) {
      const osc = ctx.createOscillator(), env = ctx.createGain();
      const now = ctx.currentTime + delay;
      osc.type = kind === 'release' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      if (kind === 'release') osc.frequency.exponentialRampToValueAtTime(pitch * .65, now + .10);
      env.gain.setValueAtTime(.0001, now);
      env.gain.exponentialRampToValueAtTime(Math.max(.0001, volume * level), now + .018);
      env.gain.exponentialRampToValueAtTime(.0001, now + life);
      osc.connect(env); env.connect(ctx.destination);
      osc.start(now); osc.stop(now + life + .03);
      osc.addEventListener('ended', () => { osc.disconnect(); env.disconnect(); }, { once: true });
    }
  }
}
