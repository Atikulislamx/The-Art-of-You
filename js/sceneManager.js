export const chapters = ['heart', 'wish', 'bloom', 'letter', 'secret', 'finale'];

export class SceneManager {
  constructor(site, { motion, timing, mounts, onEnter }) {
    this.site = site;
    this.motion = motion;
    this.timing = timing;
    this.mounts = mounts;
    this.onEnter = onEnter;
    this.sections = new Map([...site.querySelectorAll('[data-scene]')].map(section => [section.dataset.scene, section]));
    this.buttons = [...site.querySelectorAll('[data-chapter]')];
    for (const [name, section] of this.sections) section.id = `chapter-${name}`;
    for (const button of this.buttons) button.setAttribute('aria-controls', `chapter-${button.dataset.chapter}`);
    this.current = 'heart';
    this.visited = new Set([this.current]);
    this.transitioning = false;
    site.style.setProperty('--scene-ms', `${timing.sceneIn}ms`);
    site.style.setProperty('--leave-ms', `${timing.sceneOut}ms`);
    site.addEventListener('click', event => {
      const previous = event.target.closest('[data-chapter]');
      const next = event.target.closest('[data-next]');
      if (previous && !previous.disabled) this.go(previous.dataset.chapter);
      if (next && next.closest('[data-scene]')?.dataset.scene === this.current) this.advance(next.dataset.next);
    });
    this.enter(this.current, false);
  }

  advance(name) {
    if (chapters.indexOf(name) === chapters.indexOf(this.current) + 1) this.go(name, { unlock: true });
  }

  go(name, { unlock = false, reset = false } = {}) {
    if (this.transitioning || this.current === name || !this.sections.has(name) || (!unlock && !this.visited.has(name))) return false;
    const from = this.sections.get(this.current);
    this.transitioning = true;
    from.inert = true;
    from.classList.add('is-leaving');
    const swap = () => {
      from.hidden = true;
      from.classList.remove('is-active', 'is-leaving', 'is-returning');
      this.controller.abort();
      if (reset) this.visited.clear();
      this.current = name;
      this.visited.add(name);
      this.enter(name, true);
      this.transitioning = false;
    };
    if (this.motion.matches || this.timing.sceneOut <= 0) swap();
    else setTimeout(swap, this.timing.sceneOut);
    return true;
  }

  enter(name, focus) {
    const target = this.sections.get(name);
    this.controller = new AbortController();
    this.site.dataset.theme = name === 'wish' ? 'velvet' : 'paper';
    target.hidden = false;
    target.inert = false;
    target.classList.add('is-active');
    if (focus && name === 'heart') target.classList.add('is-returning');
    for (const button of this.buttons) {
      const id = button.dataset.chapter;
      button.disabled = !this.visited.has(id);
      if (id === name) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
    this.mounts[name]?.(target, this.controller.signal);
    this.onEnter?.(name);
    if (focus) {
      window.scrollTo(0, 0);
      document.getElementById(target.getAttribute('aria-labelledby'))?.focus({ preventScroll: true });
    }
  }
}
