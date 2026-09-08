#!/usr/bin/env node
/** Deterministic idle choreography, native hair compositing, and gesture review. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createCanvas, loadImage } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
require('node:module').registerHooks({
  resolve(specifier, context, next) {
    return next(specifier.startsWith('./alice-') && !specifier.endsWith('.ts') ? `${specifier}.ts` : specifier, context);
  },
});
async function main() {
  const rig = await import(pathToFileURL(path.resolve('models/alice/alice-rig.ts')));
  const motion = await import(pathToFileURL(path.resolve('models/alice/alice-motion.ts')));
  const { definitionFromManifest } = await import(pathToFileURL(path.resolve('models/alice/alice-rig-assets.ts')));
  const { composeFaceFrames } = await import(pathToFileURL(path.resolve('models/alice/alice-face.ts')));
  const { createCanvasBodyPainter } = await import(pathToFileURL(path.resolve('models/alice/alice-body.ts')));
  let seed = 734;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const controller = motion.createIdleMotion(random), state = rig.createRigState();
  const gestureStarts = [], variants = new Set(), samples = [], holds = [];
  let lastStart = null, previousLean = 0, maxStep = 0;
  let heldGesture = null, heldAt = 0;
  for (let i = 0; i < 60 * 90; i++) {
    const gesture = motion.advanceIdleMotion(controller, 1 / 60, true, random);
    rig.advanceRig(state, i / 60, 1 / 60, true, false, 1.15, gesture);
    maxStep = Math.max(maxStep, Math.abs(state.torso.value - previousLean)); previousLean = state.torso.value;
    if (controller.startedAt !== null && controller.startedAt !== lastStart) {
      if (heldGesture) {
        const hold = controller.elapsed - heldAt;
        assert(hold >= 2.5 && hold <= 4.5 + 1 / 60, `Stance held outside 2.5–4.5s: ${hold}s`); holds.push(hold);
        assert.deepEqual(gesture, heldGesture, 'Next move must start at the held stance');
        heldGesture = null;
      }
      gestureStarts.push(i / 60); variants.add(controller.variant); lastStart = controller.startedAt;
    }
    if (controller.startedAt === null && controller.variant !== -1) {
      if (heldGesture) assert.deepEqual(gesture, heldGesture, 'Stance must not rebound while resting');
      else { heldGesture = { ...gesture }; heldAt = controller.elapsed; }
    }
    samples.push({ time: i / 60, x: state.torso.value, gesture: Math.abs(gesture.lean) });
  }
  assert(gestureStarts.length >= 13 && gestureStarts.length <= 21, 'Stance cadence must include transitions and 2.5–4.5s holds');
  assert(variants.size === 4, 'All four gesture families must be reachable');
  assert(gestureStarts[0] <= 4.1, 'First gesture must be noticeable shortly after load');
  const active = samples.filter(s => s.gesture > .5);
  const quiet = [], quietState = rig.createRigState();
  for (let i = 0; i < 1800; i++) {
    rig.advanceRig(quietState, i / 60, 1 / 60, true, false, 1.15);
    if (i > 120) quiet.push(quietState.torso.value);
  }
  const span = values => Math.max(...values) - Math.min(...values);
  // Approximate head travel in a 380×650 portrait (native neck-to-hip distance 2300).
  const scale = 650 * 1.94 / 5392;
  const idleTravel = span(quiet) * 2300 * scale;
  const gestureTravel = span(active.map(s => s.x)) * 2300 * scale;
  assert(idleTravel > 12, `Idle travel is too small: ${idleTravel}`);
  assert(gestureTravel > 55, `Gesture travel is too small: ${gestureTravel}`);
  assert(maxStep * 2300 * scale < 3, 'Gesture should not teleport between frames');
  for (let i = 0; i < 600; i++) assert.deepEqual(motion.advanceIdleMotion(controller, 1 / 60, false, random), motion.REST_GESTURE, 'Disabling autonomous motion must return to the centered stance');
  assert.equal(controller.elapsed, 0, 'Disabling autonomous motion must pause choreography');
  assert.equal(controller.startedAt, null, 'Disabling autonomous motion must cancel the previous gesture');
  const resumed = motion.advanceIdleMotion(controller, 1 / 60, true, random);
  assert.deepEqual(resumed, motion.REST_GESTURE, 'Autonomous motion must resume from center');
  rig.advanceRig(state, 0, 1 / 60, false, false, 1.15, { lean: 1, lift: 1, turn: 1, nod: 1 });
  for (let i = 0; i < 600; i++) rig.advanceRig(state, 0, 1 / 60, false, false, 1.15);
  assert(Object.values(state).every(s => Math.abs(s.value) < .0001), 'Reduced motion must settle');

  // Synthetic half-transparent hair exposes double-painting at every old strip seam.
  const texture = createCanvas(96, 120), tx = texture.getContext('2d');
  tx.fillStyle = 'rgba(30,30,45,0.5)'; tx.fillRect(0, 0, 96, 120);
  for (const amount of [-6.9, -.0002, 0, .0002, 6.9]) {
    const surface = createCanvas(120, 140), ctx = surface.getContext('2d');
    rig.drawHair(ctx, texture, { x: 12, y: 10, width: 96, height: 120 }, 60, 120, amount);
    const pixels = ctx.getImageData(30, 12, 50, 116).data;
    for (let i = 3; i < pixels.length; i += 4) assert(Math.abs(pixels[i] - 127) <= 1, 'Hair strips overlap or leave a gap');
  }
  const output = path.resolve('work/alice/motion-fix'); fs.mkdirSync(output, { recursive: true });
  const report = { gestureStarts, holds, variants: [...variants], idleTravelPixels: idleTravel, gestureTravelPixels: gestureTravel, maximumFrameStepPixels: maxStep * 2300 * scale, poses: [] };
  const sheet = createCanvas(380 * 4, 700 * 4), review = sheet.getContext('2d');
  for (const [row, pose] of ['idle', 'thinking', 'front', 'shy'].entries()) {
    const base = path.resolve('public/models/alice/layers', pose === 'idle' ? '' : pose);
    const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json')));
    const definition = definitionFromManifest(manifest), images = {};
    for (const layer of manifest.layers) images[layer.id] = await loadImage(path.join(base, layer.runtimeFile));
    composeFaceFrames(images, definition, createCanvas);
    const frame = { state: rig.createRigState(), time: 0, motion: false, fullBody: false, strength: 1.15, blink: 'open', mouthOpen: false, exploded: false, definition };
    const head = images.headComposite;
    const roots = [];
    for (const direction of [-1, 1]) {
      frame.state.left.value = direction * .22; frame.state.right.value = -direction * .22;
      frame.state.leftTip.value = direction * .3; frame.state.rightTip.value = -direction * .3;
      head.paint(frame);
      const height = Math.floor((Math.min(images.hairRibbons.left.root, images.hairRibbons.right.root) - head.layer.y - 3) * head.image.height / head.layer.height);
      roots.push(head.image.getContext('2d').getImageData(0, 0, head.image.width, height).data);
    }
    assert.equal(Buffer.compare(Buffer.from(roots[0]), Buffer.from(roots[1])), 0, `${pose}: moving hair changes face-adjacent roots`);
    const body = createCanvasBodyPainter(definition);
    for (let column = 0; column < 4; column++) {
      const direction = column < 2 ? -1 : 1;
      const gesture = { lean: direction, lift: column % 2 ? -.8 : .5, turn: -direction * .8, nod: .5 };
      const s = rig.createRigState();
      for (let i = 0; i < 120; i++) rig.advanceRig(s, i / 60, 1 / 60, true, false, column % 2 ? 1.8 : 1.15, gesture);
      const tile = createCanvas(380, 650);
      rig.drawRig(tile.getContext('2d'), 380, 650, images, { ...frame, state: s, motion: true, strength: column % 2 ? 1.8 : 1.15 }, body);
      for (const [width, height] of [[380, 650], [240, 420]]) {
        const headOnly = createCanvas(width, height), ctx = headOnly.getContext('2d');
        rig.drawRig(ctx, width, height, images, { ...frame, state: s }, () => {});
        for (const x of [0, width - 1]) {
          const edge = ctx.getImageData(x, 0, 1, height).data;
          assert(!edge.some((v, i) => i % 4 === 3 && v > 8), `${pose}: head clips at ${width}px during a large gesture`);
        }
      }
      review.fillStyle = '#191823'; review.fillRect(column * 380, row * 700, 380, 700);
      review.drawImage(tile, column * 380, row * 700 + 50);
      review.fillStyle = '#eee8f7'; review.font = '18px sans-serif';
      review.fillText(`${pose} / ${direction < 0 ? 'left' : 'right'} / ${column % 2 ? 'stress 1.8' : 'live 1.15'}`, column * 380 + 16, row * 700 + 30);
    }
    report.poses.push({ pose, rootsPinned: true });
  }
  fs.writeFileSync(path.join(output, 'gesture-review.png'), sheet.toBuffer('image/png'));
  fs.writeFileSync(path.join(output, 'motion-report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS: ${gestureStarts.length} stance changes, all 4 variants; minimum hold ${Math.min(...holds).toFixed(1)}s, no rebound; idle ${idleTravel.toFixed(1)}px, gestures ${gestureTravel.toFixed(1)}px, max step ${(maxStep * 2300 * scale).toFixed(2)}px; stable alpha and all 4 hair roots.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
