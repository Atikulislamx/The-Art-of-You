import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { root } from './site-files.mjs';

const image = async (path, type) => `data:${type};base64,${(await readFile(join(root, path))).toString('base64')}`;
const fonts = {
  serif: await image('assets/fonts/playfair-display.woff2', 'font/woff2'),
  italic: await image('assets/fonts/playfair-display-italic.woff2', 'font/woff2'),
  sans: await image('assets/fonts/inter.woff2', 'font/woff2'),
};
const art = {
  logo: await image('assets/images/logo.svg', 'image/svg+xml'),
  sprig: await image('assets/images/botanical-sprig.svg', 'image/svg+xml'),
  paper: await image('assets/images/keepsake-paper.webp', 'image/webp'),
  heart: await image('assets/images/wax-heart.webp', 'image/webp'),
};
const spark = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 0c.7 8.6 3.4 11.3 12 12-8.6.7-11.3 3.4-12 12-.7-8.6-3.4-11.3-12-12C8.6 11.3 11.3 8.6 12 0Z"/></svg>';
function markup(repo) {
  return `<!doctype html><meta charset="utf-8"><style>
    @font-face{font-family:Playfair;src:url(${fonts.serif});font-weight:400 900}
    @font-face{font-family:Playfair;src:url(${fonts.italic});font-weight:400 900;font-style:italic}
    @font-face{font-family:Inter;src:url(${fonts.sans});font-weight:100 900}
    *{box-sizing:border-box}
    body{margin:0;color:#38252b;background:radial-gradient(ellipse at 19% 12%,#fffaf1,#fae9df 77%,#f4d7cd);overflow:hidden}
    main{height:100vh;padding:60px 76px 64px 90px;display:grid;grid-template-columns:1.03fr 1fr;gap:52px;align-items:center;isolation:isolate}
    main:before{content:'';position:absolute;inset:21px;border:1px solid #caa99a;pointer-events:none}
    main:after{content:'';position:absolute;z-index:-1;left:-87px;bottom:-104px;width:325px;height:405px;transform:rotate(22deg);background:url(${art.sprig}) center/contain no-repeat;opacity:.23}
    .eyebrow{display:flex;align-items:center;gap:9px;font:650 11px Inter;letter-spacing:.23em;text-transform:uppercase;color:#78434d;white-space:nowrap}
    .eyebrow img{width:50px;height:50px;margin-left:-5px;margin-right:8px}
    h1{font:500 ${repo ? 120 : 115}px/.87 Playfair;margin:26px 0 34px;letter-spacing:-.071em}
    h1 em{display:block;font-weight:500;color:#a43148;line-height:1.02}
    p{margin:0;color:#634c51;font:450 19px/1.64 Inter}
    .subtitle{max-width:360px}
    .ornament{display:flex;align-items:center;gap:12px;color:#a87946;margin-top:34px;font:600 9px Inter;letter-spacing:.22em;text-transform:uppercase}
    .ornament:before{content:'';width:40px;height:1px;background:#c39b65}
    .plate{position:relative;height:100%;max-height:508px;min-width:0;border:1px solid #bd927f;box-shadow:0 13px 28px #74402f29;overflow:hidden;background:linear-gradient(140deg,#ffead24f,transparent,#61292621),url(${art.paper}) 69% center/cover}
    .plate:before{content:'';position:absolute;inset:11px;border:1px solid #fff0cfb0}
    .plate svg{position:absolute;top:28px;right:28px;color:#fff2ce;filter:drop-shadow(0 1px 3px #4e2f23aa)}
    .orbit,.heart{position:absolute;left:49%;top:46%;transform:translate(-50%,-50%)}
    .orbit{width:76%;aspect-ratio:1;border:1px solid #fff2cfa8;border-radius:50%;box-shadow:0 0 62px #ffe1a856;background:radial-gradient(circle,#f5bd9a31,transparent 68%)}
    .orbit:before{content:'';position:absolute;inset:-10px;border:1px solid #fff2cf6b;border-radius:50%}
    .heart{display:block;width:63%;height:auto;filter:drop-shadow(12px 22px 26px #692d275e)}
    .catalog{position:absolute;bottom:28px;left:28px;padding:7px 10px;background:#fff3dfdd;color:#663c3b;font:650 9px Inter;letter-spacing:.20em;text-transform:uppercase}
    .repo .plate{background:radial-gradient(ellipse at 45% 45%,#ffeccc31,#81534b40),url(${art.paper}) 89% 60%/cover}
    .repo .heart,.repo .orbit{left:46%;top:47%}
    .repo .eyebrow{gap:11px}
  </style><main class="${repo ? 'repo' : 'web'}">
    <div class="copy"><div class="eyebrow"><img src="${art.logo}" alt="">${repo ? 'The keepsake · Six chapters' : 'A birthday keepsake'}</div>
    <h1>The Art<em>of You</em></h1>
    <p class="subtitle">${repo ? 'An interactive birthday experience<br>in six illustrated chapters.' : 'Some feelings are art.<br>Some people are the reason.'}</p>
    <div class="ornament">${repo ? 'Pull · Wish · Bloom' : 'For someone worth celebrating'}</div></div>
    <div class="plate"><span class="orbit"></span><img class="heart" src="${art.heart}" alt="">${spark}<span class="catalog">Fig. 01 &nbsp; — &nbsp; The Keepsake</span></div>
  </main>`;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [width, height, filename, repo] of [
    [1200, 630, 'social-preview.png', false], [1280, 640, 'github-social-preview.png', true],
  ]) {
    await page.setViewportSize({ width, height });
    await page.setContent(markup(repo));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: join(root, 'assets/images', filename) });
    console.log(`${filename} · ${width}×${height}`);
  }
  const icon = await readFile(join(root, 'favicon.svg'), 'utf8');
  for (const [size, path] of [[16, 'favicon-16x16.png'], [32, 'favicon-32x32.png'], [180, 'apple-touch-icon.png'], [192, 'assets/images/icon-192.png'], [512, 'assets/images/icon-512.png']]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:auto}</style>${icon}`);
    await page.screenshot({ path: join(root, path), omitBackground: true });
  }
} finally { await browser.close(); }
