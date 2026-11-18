import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.SITE_URL || 'http://127.0.0.1:4173/The-Art-of-You/';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
const viewportSizes = [[360, 800], [390, 844], [430, 932], [768, 1024], [1366, 768], [1920, 1080]];
let failures = 0;

async function check(name, run, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(() => {
      window.musicPlayCount = 0;
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.musicPlayCount++;
        window.storyTrack = this;
        return play.apply(this, args);
      };
    });
    await run(page, context);
    assert.deepEqual(errors, [], 'no runtime or asset errors');
    console.log(`✓ ${name}`);
  } catch (error) { failures++; console.error(`✗ ${name}\n${error.stack}`); }
  finally { await context.close(); }
}

async function open(page) {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-bow-grip]').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.musicPlayCount), 0);
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'false');
}

async function chapter(page, name, verifyFocus = true) {
  const active = page.locator(`[data-scene=${name}]:not([hidden])`);
  await active.waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-scene]:not([hidden])').count(), 1);
  assert.equal(await page.locator('[aria-current=step]').getAttribute('data-chapter'), name);
  if (verifyFocus) assert.equal(await active.evaluate(section => document.activeElement.id), await active.getAttribute('aria-labelledby'));
  const fit = await active.evaluate(section => {
    const viewport = document.documentElement.clientWidth;
    const stage = section.querySelector('.scene-plate');
    const canvas = stage?.querySelector('canvas');
    const box = stage?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > viewport,
      sceneClipped: box && (box.left < 0 || box.right > viewport + 1),
      dprTooHigh: canvas && canvas.width > canvas.clientWidth * 2 + 1,
      tooSmall: [...section.querySelectorAll('button:not([hidden])')].filter(b => b.getClientRects().length).some(b => b.offsetHeight < 44 || b.offsetWidth < 44),
    };
  });
  assert.ok(!fit.overflow && !fit.sceneClipped && !fit.dprTooHigh && !fit.tooSmall, `${name} layout: ${JSON.stringify(fit)}`);
  return active;
}
const next = (page, name) => page.locator(`[data-next=${name}]`).click();

for (const [width, height] of viewportSizes) {
  const phone = width <= 430;
  await check(`six chapters at ${width}×${height} (reduced motion, DPR ${phone ? 3 : 1})`, async page => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    });
    await open(page);
    await chapter(page, 'heart', false);
    assert.ok(await page.locator('[data-chapter=wish]').isDisabled());
    await page.getByRole('button', { name: 'Begin the story' }).click();
    await chapter(page, 'wish');
    assert.equal(await page.locator('#wish-title').textContent(), 'Happy Birthday');
    await next(page, 'bloom');
    await chapter(page, 'bloom');
    await page.waitForFunction(() => {
      const c = document.querySelector('[data-scene=bloom] canvas');
      return c.width > 300 && c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((p, i) => i % 4 === 3 && p > 100);
    });
    await next(page, 'letter');
    await chapter(page, 'letter');
    assert.equal(await page.locator('[data-letter] p').count(), 3);
    await next(page, 'secret');
    await chapter(page, 'secret');
    assert.ok(await page.locator('#secret-message').isHidden());
    assert.ok(await page.locator('[data-next=finale]').isHidden());
    await page.getByRole('button', { name: /Break the seal/ }).click();
    assert.ok(await page.locator('#secret-message').isVisible());
    assert.ok(await page.locator('[data-secret-text]').evaluate(el => document.activeElement === el));
    await next(page, 'finale');
    await chapter(page, 'finale');
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const field = page.locator('[data-share-link]');
    await field.waitFor();
    assert.equal(await field.inputValue(), url);
    await page.locator('[data-chapter=letter]').click();
    await chapter(page, 'letter');
    await page.locator('[data-chapter=finale]').click();
    await chapter(page, 'finale');
    await page.getByRole('button', { name: 'Replay the story' }).click();
    await chapter(page, 'heart');
    assert.ok(await page.locator('[data-chapter=finale]').isDisabled());
    assert.ok(await page.locator('.wax-heart').evaluate(el => Number(getComputedStyle(el).opacity) === 1));
  }, { viewport: { width, height }, reducedMotion: 'reduce', isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 3 : 1 });
}

await check('mouse pull cancels when too short; a full pull launches, impacts, then plays the score', async page => {
  await open(page);
  const handle = page.locator('[data-bow-grip]');
  const start = await handle.boundingBox();
  const x = start.x + start.width / 2, y = start.y + start.height / 2;
  const initial = await handle.evaluate(el => parseFloat(el.style.left));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y - 12, { steps: 4 });
  await page.mouse.up();
  assert.equal(await page.locator('[data-pull-label]').textContent(), 'Pull back, then let go');
  assert.equal(await page.evaluate(() => window.musicPlayCount), 0);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 67, y + 47, { steps: 8 });
  await page.waitForFunction(previous => parseFloat(document.querySelector('[data-bow-grip]').style.left) < previous - 17, initial);
  assert.equal(await page.locator('[data-pull-label]').textContent(), 'Let go');
  await page.mouse.up();
  await page.locator('[data-bow-stage].is-releasing').waitFor();
  await page.waitForFunction(() => Number(document.querySelector('.wax-heart').style.opacity || 1) < .25);
  await chapter(page, 'wish');
  await page.waitForFunction(() => window.storyTrack?.currentTime > .1);
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-sound]').click();
  await page.waitForFunction(() => window.storyTrack.paused);
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'false');
  await page.reload();
  await page.locator('[data-launch]').click();
  await chapter(page, 'wish');
  assert.equal(await page.evaluate(() => window.musicPlayCount), 0, 'explicit mute persists across a reload');
}, { viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });

await check('touch drag moves the bowstring and releases the arrow', async (page, context) => {
  await open(page);
  const grip = page.locator('[data-bow-grip]');
  const bounds = await grip.boundingBox();
  const initial = await grip.evaluate(el => parseFloat(el.style.left));
  const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
  const touch = await context.newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 22, y: y + 14, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 42, y: y + 25, id: 1 }] });
  await page.waitForFunction(previous => parseFloat(document.querySelector('[data-bow-grip]').style.left) < previous - 19, initial);
  assert.equal(await page.locator('[data-pull-label]').textContent(), 'Let go');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await chapter(page, 'wish');
}, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'no-preference' });

await check('Wish reveals in stages and the Canvas tree grows before the letter', async page => {
  await open(page);
  await page.locator('[data-launch]').click();
  await chapter(page, 'wish');
  const opacity = await page.locator('#wish-title').evaluate(el => Number(getComputedStyle(el).opacity));
  assert.ok(opacity < .5, 'the main wish is initially dimmed');
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#wish-title')).opacity) > .98);
  await next(page, 'bloom');
  await chapter(page, 'bloom');
  function ink(canvas) {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let pixels = 0;
    for (let i = 3; i < data.length; i += 256) if (data[i] > 110) pixels++;
    return pixels;
  }
  const tree = page.locator('[data-scene=bloom] canvas');
  const justPlanted = await tree.evaluate(ink);
  await page.waitForFunction(threshold => {
    const c = document.querySelector('[data-scene=bloom] canvas');
    const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let pixels = 0;
    for (let i = 3; i < data.length; i += 256) if (data[i] > 110) pixels++;
    return pixels > threshold;
  }, Math.max(justPlanted * 4, 125), { polling: 180 });
  await next(page, 'letter');
  await chapter(page, 'letter');
}, { viewport: { width: 1366, height: 768 }, reducedMotion: 'no-preference' });

await check('keyboard release and audio unavailable fallback', async page => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Playback not allowed', 'NotAllowedError'));
  });
  await open(page);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Tab');
  assert.ok(await page.locator('[data-bow-grip]').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Space');
  await chapter(page, 'wish');
  assert.equal(await page.locator('[data-sound]').getAttribute('aria-pressed'), 'false');
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('[data-next=bloom]').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Enter');
  await chapter(page, 'bloom');
}, { viewport: { width: 768, height: 1024 }, reducedMotion: 'reduce' });

await browser.close();
if (failures) process.exitCode = 1;
