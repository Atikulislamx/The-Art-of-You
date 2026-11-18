import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { bowGeometry, localToStage, measurePull, arrowFlight } from '../js/bowInteraction.js';
import { makeTree, pointOnBranch } from '../js/bloomingTree.js';
import { chapters } from '../js/sceneManager.js';
import { config } from '../js/config.js';
import { defaultSiteUrl, root } from '../scripts/site-files.mjs';

for (const [w, h] of [[318, 278], [720, 510], [790, 680]]) {
  test(`bow pull, stage transform and flight at ${w}×${h}`, () => {
    const g = bowGeometry(w, h);
    const grip = localToStage(g, -g.span * .49, 0);
    assert.ok(grip.x > 23 && grip.y < h - 23);
    const slow = measurePull(g, -g.cos * 16, -g.sin * 16);
    const wrong = measurePull(g, g.cos * 60, g.sin * 60);
    const strong = measurePull(g, -g.cos * 500, -g.sin * 500);
    assert.ok(Math.abs(slow.pull - 16) < 1e-8);
    assert.equal(wrong.pull, 0);
    assert.equal(strong.pull, g.span * .93);
    const tip = localToStage(g, g.span * .67, 0);
    for (const tilt of [-.28, 0, .28]) {
      const first = arrowFlight(tip, g.target, g.angle, tilt, 0);
      const flight = arrowFlight(tip, g.target, g.angle, tilt, .5);
      const end = arrowFlight(tip, g.target, g.angle, tilt, 1);
      assert.equal(first.x, tip.x); assert.equal(first.y, tip.y);
      assert.equal(end.x, g.target.x); assert.equal(end.y, g.target.y);
      assert.ok(flight.x > tip.x && flight.x < g.target.x && Number.isFinite(flight.angle));
    }
  });
}

test('tree geometry is reproducible and branches/blooms fit the art and timeline', () => {
  const tree = makeTree(config.animation.treeSeed);
  assert.deepEqual(tree, makeTree(config.animation.treeSeed));
  assert.notDeepEqual(tree, makeTree(config.animation.treeSeed + 1));
  assert.ok(tree.branches.length > 60 && tree.blossoms.length > 180);
  let start = 0;
  for (const edge of tree.branches) {
    assert.ok(edge.start >= start && edge.end > edge.start && edge.end <= tree.duration);
    assert.ok(edge.w >= edge.nw && edge.nw >= 0);
    assert.deepEqual(pointOnBranch(edge, 0), { x: edge.x, y: edge.y });
    assert.deepEqual(pointOnBranch(edge, 1), { x: edge.tx, y: edge.ty });
    start = edge.start;
  }
  for (const flower of tree.blossoms) assert.ok(flower.when < tree.duration && flower.x > 0 && flower.x < 680 && flower.y > 0 && flower.y < 590);
});

test('six chapters, local resources and canonical sharing metadata are present', async () => {
  const page = await readFile(join(root, 'index.html'), 'utf8');
  assert.deepEqual([...page.matchAll(/data-scene="(\w+)"/g)].map(m => m[1]), chapters);
  assert.deepEqual([...page.matchAll(/data-chapter="(\w+)"/g)].map(m => m[1]), chapters);
  for (const [, asset] of page.matchAll(/(?:src|href)="\.\/([^"\s]+)"/g)) assert.ok((await stat(join(root, asset))).isFile(), asset);
  const css = await readFile(join(root, 'css/site.css'), 'utf8');
  for (const [, asset] of css.matchAll(/url\('\.\.\/([^'\s]+)'\)/g)) assert.ok((await stat(join(root, asset))).isFile(), asset);
  const social = `${defaultSiteUrl}assets/images/social-preview.png`;
  assert.ok(page.includes(`rel="canonical" href="${defaultSiteUrl}"`));
  assert.ok(page.includes(`property="og:url" content="${defaultSiteUrl}"`));
  assert.ok(page.includes(`property="og:image" content="${social}"`));
  assert.ok(page.includes(`name="twitter:image" content="${social}"`));
  const audio = await readFile(join(root, config.audio.source));
  assert.equal(audio.subarray(0, 3).toString(), 'ID3');
  assert.ok(audio.length > 100_000);
});

test('social images and all favicon variants have the specified dimensions', async () => {
  const manifest = JSON.parse(await readFile(join(root, 'site.webmanifest'), 'utf8'));
  const pngs = [
    ['assets/images/social-preview.png', 1200, 630], ['assets/images/github-social-preview.png', 1280, 640],
    ['favicon-16x16.png', 16, 16], ['favicon-32x32.png', 32, 32], ['apple-touch-icon.png', 180, 180],
    ...manifest.icons.map(i => [i.src, ...i.sizes.split('x').map(Number)]),
  ];
  for (const [path, w, h] of pngs) {
    const png = await readFile(join(root, path));
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', path);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [w, h], path);
    if (path.endsWith('github-social-preview.png')) assert.ok(png.length < 1_000_000);
  }
});
