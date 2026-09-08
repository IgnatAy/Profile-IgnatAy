#!/usr/bin/env node
/** Hair-only regressions: temporal lag, actual contour movement, pinned inner
 * seams and stable alpha at the native compositing resolution. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createCanvas, loadImage } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
require('node:module').registerHooks({ resolve(s, c, next) { return next(s.startsWith('./alice-') && !s.endsWith('.ts') ? s + '.ts' : s, c); } });
async function main() {
  const { advanceHairChain, drawHairRibbon, prepareHairRibbon } = await import(pathToFileURL(path.resolve('models/alice/alice-hair.ts')));
  const { createRigState, advanceRig } = await import(pathToFileURL(path.resolve('models/alice/alice-rig.ts')));
  const { composeFaceFrames } = await import(pathToFileURL(path.resolve('models/alice/alice-face.ts')));
  const { definitionFromManifest } = await import(pathToFileURL(path.resolve('models/alice/alice-rig-assets.ts')));
  const spring = () => ({ value: 0, velocity: 0 });
  const middle = spring(), end = spring(), flutter = spring(), response = [];
  for (let i = 0; i < 240; i++) {
    // Constant ambient phase isolates the response to a short head-motion pulse.
    advanceHairChain(middle, end, flutter, -1, 0, 1 / 120, i < 12 ? .18 : 0, 0, true, 1.15);
    response.push({ middle: Math.abs(middle.value), end: Math.abs(end.value) });
  }
  const peak = key => response.reduce((best, row, i) => row[key] > response[best][key] ? i : best, 0) / 120;
  const lag = peak('end') - peak('middle');
  assert(lag > .1, `Tip must trail the middle, measured ${lag}s`);
  assert(response[60].end > .001, 'Hair should continue moving after the head has stopped');
  for (let i = 0; i < 600; i++) advanceHairChain(middle, end, flutter, -1, 0, 1 / 60, 0, 0, false, 1.15);
  assert([middle, end, flutter].every(s => Math.abs(s.value) < .00001), 'Reduced motion should settle all hair modes');

  const synthetic = createCanvas(96, 240), syntheticContext = synthetic.getContext('2d');
  syntheticContext.fillStyle = 'rgba(30,30,45,.5)'; syntheticContext.fillRect(8, 0, 80, 240);
  for (const side of [-1, 1]) for (const amount of [-.22, -.0002, 0, .0002, .22]) {
    const ribbon = prepareHairRibbon(synthetic, { x: 0, y: 0, width: 96, height: 240 }, side, 150, 235, createCanvas);
    const surface = createCanvas(200, 240), ctx = surface.getContext('2d'); ctx.translate(50, 0);
    drawHairRibbon(ctx, ribbon, amount, amount, amount * .2);
    const pixels = ctx.getImageData(0, 0, 200, 240).data;
    for (let y = 0; y < 235; y++) {
      let first = 200, last = -1;
      for (let x = 0; x < 200; x++) if (pixels[(y * 200 + x) * 4 + 3] >= 126) { first = Math.min(first, x); last = x; }
      for (let x = first + 2; x < last - 2; x++) assert(Math.abs(pixels[(y * 200 + x) * 4 + 3] - 127) <= 2, 'Ribbon introduces translucent seams or dark overlap');
    }
  }

  const report = { tipLagSeconds: lag, poses: {} }, output = path.resolve('work/alice/hair-redesign');
  fs.mkdirSync(output, { recursive: true });
  const sheet = createCanvas(1600, 1760), review = sheet.getContext('2d');
  review.fillStyle = '#24212e'; review.fillRect(0, 0, sheet.width, sheet.height);
  for (const [poseIndex, pose] of ['idle', 'front', 'thinking', 'shy'].entries()) {
    const base = path.resolve('public/models/alice/layers', pose === 'idle' ? '' : pose);
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'))), definition = definitionFromManifest(manifest), images = {};
    for (const layer of manifest.layers) images[layer.id] = await loadImage(path.join(base, layer.runtimeFile));
    composeFaceFrames(images, definition, createCanvas);
    const measurements = {};
    for (const side of ['left', 'right']) {
      const ribbon = images.hairRibbons[side], rendered = [], positions = [];
      const rx = ribbon.width / ribbon.layer.width, ry = ribbon.height / ribbon.layer.height;
      const paint = (a, b, f) => {
        const surface = createCanvas(ribbon.width, ribbon.height), ctx = surface.getContext('2d');
        ctx.setTransform(rx, 0, 0, ry, -ribbon.layer.x * rx, -ribbon.layer.y * ry);
        drawHairRibbon(ctx, ribbon, a, b, f);
        return ctx.getImageData(0, 0, ribbon.width, ribbon.height).data;
      };
      for (const direction of [-1, 1]) rendered.push(paint(direction * .22, direction * .3, direction * .04));
      let seamSamples = 0;
      for (let y = 0; y < Math.floor((ribbon.pin - ribbon.layer.y - 2) * ry); y++) {
        const span = ribbon.rows[y]; if (span.right <= span.left) continue;
        const a = side === 'left' ? span.right - 3 : span.left;
        const b = side === 'left' ? span.right : span.left + 3;
        for (let x = a; x < b; x++) for (let channel = 0; channel < 4; channel++) {
          const index = (y * ribbon.width + x) * 4 + channel;
          assert.equal(rendered[0][index], rendered[1][index], `${pose}/${side}: face-side seam moved`); seamSamples++;
        }
      }
      const state = createRigState();
      const middleRow = Math.floor(((ribbon.root + ribbon.pin) / 2 - ribbon.layer.y) * ry);
      for (let i = 0; i < 900; i++) {
        advanceRig(state, i / 60, 1 / 60, true, false, 1.15);
        if (i < 120 || i % 15) continue;
        const pixels = paint(state[side].value, state[side + 'Tip'].value, state[side + 'Flutter'].value);
        let left = ribbon.width, right = 0;
        for (let x = 0; x < ribbon.width; x++) if (pixels[(middleRow * ribbon.width + x) * 4 + 3] > 64) { left = Math.min(left, x); right = x; }
        positions.push(side === 'left' ? left : right);
      }
      const nativeTravel = (Math.max(...positions) - Math.min(...positions)) / rx;
      const portraitScale = Math.min(650 * 1.94 / definition.height, definition.rig.portraitWidth ? 380 * .94 / definition.rig.portraitWidth : Infinity);
      const visibleTravel = nativeTravel * portraitScale;
      assert(visibleTravel > 2, `${pose}/${side}: middle remains imperceptible (${visibleTravel}px)`);
      measurements[side] = { seamSamples, middleTravelPixels: visibleTravel };
    }
    const state = createRigState(); let column = 0;
    for (let i = 0; i <= 490; i++) {
      advanceRig(state, i / 60, 1 / 60, true, false, 1.15);
      if (![0, 110, 260, 370, 490].includes(i)) continue;
      const head = images.headComposite;
      head.paint({ state, time: i / 60, fullBody: false, motion: true, strength: 1.15, blink: 'open', mouthOpen: false, exploded: false, definition });
      review.drawImage(head.image, column * 320, poseIndex * 440 + 28, 320, 320 * head.image.height / head.image.width);
      review.fillStyle = '#eee9f8'; review.font = '17px sans-serif'; review.fillText(`${pose} / ${(i / 60).toFixed(1)}s`, column * 320 + 12, poseIndex * 440 + 22);
      column++;
    }
    report.poses[pose] = measurements;
    console.log(`PASS ${pose}: protected inner seams; middle travel L ${measurements.left.middleTravelPixels.toFixed(1)}px / R ${measurements.right.middleTravelPixels.toFixed(1)}px`);
  }
  fs.writeFileSync(path.join(output, 'hair-review.png'), sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(output, 'hair-report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS: tip trails middle by ${lag.toFixed(3)}s; alpha seams and motion-off settling verified.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
