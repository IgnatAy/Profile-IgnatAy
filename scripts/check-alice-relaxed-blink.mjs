import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { createCanvas, loadImage } from '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';

registerHooks({
  resolve(specifier, context, next) {
    return next(/^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier, context);
  },
});
const { definitionFromManifest } = await import('../models/alice/alice-rig-assets.ts');
const { composeFaceFrames } = await import('../models/alice/alice-face.ts');
const root = 'public/models/alice/layers/relaxed';
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`));
const definition = definitionFromManifest(manifest);
const images = Object.fromEntries(await Promise.all(manifest.layers.map(async (layer) =>
  [layer.id, await loadImage(`${root}/${layer.runtimeFile}`)],
)));
composeFaceFrames(images, definition, createCanvas);
const head = definition.layers.head;
const sheet = createCanvas(470 * 3, 390 * 2);
const ctx = sheet.getContext('2d');
const report = [];
for (const [row, mouth] of ['rest', 'talk'].entries()) {
  const open = images.faceFrames[`open-${mouth}`];
  const original = open.getContext('2d').getImageData(0, 0, open.width, open.height).data;
  for (const [col, eye] of ['open', 'half', 'closed'].entries()) {
    const frame = images.faceFrames[`${eye}-${mouth}`];
    const data = frame.getContext('2d').getImageData(0, 0, frame.width, frame.height).data;
    let cheekChanges = 0, eyeChanges = 0;
    for (let y = 488; y < 644; y++) for (let x = 550; x < 920; x++) {
      const at = ((y - head.y) * frame.width + x - head.x) * 4;
      const changed = data.subarray(at, at + 4).some((value, c) => value !== original[at + c]);
      if (changed) {
        // Two cheek interiors below the lower lids, excluding hair cutout edges.
        if (y >= 625 && ((x >= 580 && x < 660) || (x >= 800 && x < 880))) cheekChanges++;
        else eyeChanges++;
      }
    }
    report.push({ eye, mouth, cheekChanges, eyeChanges });
    ctx.fillStyle = '#e5e9ef';
    ctx.fillRect(col * 470, row * 390, 470, 390);
    ctx.drawImage(frame, 500 - head.x, 460 - head.y, 470, 350, col * 470, row * 390 + 40, 470, 350);
    ctx.fillStyle = '#20242c';
    ctx.font = '20px sans-serif';
    ctx.fillText(`${eye} / ${mouth}`, col * 470 + 16, row * 390 + 27);
  }
}
mkdirSync('work/alice', { recursive: true });
writeFileSync('work/alice/relaxed-blink-review.png', sheet.toBuffer('image/png'));
console.log(report);
for (const result of report) {
  assert.equal(result.cheekChanges, 0, `${result.eye}/${result.mouth}: blink erases cheek color`);
  if (result.eye !== 'open') assert(result.eyeChanges > 1000, 'Blink must still move the eyes');
}
console.log('PASS: winter relaxed blush survives half/closed blinks, at rest and while talking.');
