#!/usr/bin/env node
/*
 * Anatomical regressions and review sheets for the manifest-driven Alice rig.
 * Run from the project root with the bundled Node 24:
 *   node models/alice/scripts/check-alice-all-poses.cjs
 *   node models/alice/scripts/check-alice-all-poses.cjs --pose idle --out /private/tmp/alice-rig-smoke
 * --pose accepts a comma-separated subset. Defaults: all registered poses; work/alice.
 * This is separate from models/alice/scripts/check-alice-rig.cjs and never overwrites its files.
 * Numeric checks cover transforms/skin continuity; inspect the sheets for texture seams.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createCanvas, loadImage } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');

require('node:module').registerHooks({
  resolve(specifier, context, next) {
    return next(/^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier, context);
  },
});

function options() {
  const { ALICE_MODELS } = require('../alice-models.ts');
  const args = process.argv.slice(2), result = { model: 'winter', poses: null, out: path.resolve('work/alice') };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pose') result.poses = (args[++i] || '').split(',').filter(Boolean);
    else if (args[i] === '--model') result.model = args[++i];
    else if (args[i] === '--out') { assert(args[i + 1], '--out requires a directory'); result.out = path.resolve(args[++i]); }
    else if (args[i] === '--help') { console.log(`Usage: node check-alice-all-poses.cjs [--model ${Object.keys(ALICE_MODELS).join('|')}] [--pose idle,shy] [--out directory]`); process.exit(0); }
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  assert(ALICE_MODELS[result.model], 'Unknown model');
  result.poses ??= ALICE_MODELS[result.model].poses;
  assert(result.poses.length && result.poses.every(p => ALICE_MODELS[result.model].poses.includes(p)), 'Unknown or empty pose filter');
  result.assetBase = ALICE_MODELS[result.model].assetBase;
  return result;
}

const point = (m, p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const copyMatrix = m => Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map(k => [k, m[k]]));
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

async function main() {
  const opt = options();
  const { createRigState, advanceRig, drawRig, deformBodyPoint } = await import(pathToFileURL(path.resolve('models/alice/alice-rig.ts')));
  const { createCanvasBodyPainter } = await import(pathToFileURL(path.resolve('models/alice/alice-body.ts')));
  const { definitionFromManifest } = await import(pathToFileURL(path.resolve('models/alice/alice-rig-assets.ts')));
  const { composeFaceFrames } = await import(pathToFileURL(path.resolve('models/alice/alice-face.ts')));
  const { advanceIdleMotion, createIdleMotion } = await import(pathToFileURL(path.resolve('models/alice/alice-motion.ts')));
  fs.mkdirSync(opt.out, { recursive: true });
  const report = { generatedAt: new Date().toISOString(), strength: 1.8, poses: {}, failures: [], limitations: ['CPU Canvas renderer exercised; WebGL output still needs browser review.', 'Transform and Jacobian checks cannot certify painted neck/wrist/eye boundaries; inspect generated sheets.'] };

  for (const pose of opt.poses) {
    const checks = [], warnings = [], stats = {};
    const check = (name, fn) => {
      try { fn(); checks.push({ name, passed: true }); }
      catch (error) { checks.push({ name, passed: false, error: error.message }); report.failures.push(`${pose}: ${name}: ${error.message}`); }
    };
    try {
      const base = path.resolve('public', opt.assetBase, 'layers', pose === 'idle' ? '' : pose);
      const manifest = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
      const definition = definitionFromManifest(manifest), rig = definition.rig;
      const images = {}, pixels = {}, textureInfo = [];
      assert(new Set(manifest.layers.map(l => l.id)).size === manifest.layers.length, 'Duplicate layer IDs in manifest');
      for (const layer of manifest.layers) {
        assert(layer.runtimeFile, `${layer.id}: missing runtimeFile`);
        const image = await loadImage(path.join(base, layer.runtimeFile));
        assert(image.width > 0 && image.height > 0, `${layer.id}: empty image dimensions`);
        assert(Math.abs(image.width / layer.width - image.height / layer.height) < 2 / Math.min(layer.width, layer.height), `${layer.id}: texture aspect ratio differs from its native rectangle`);
        const surface = createCanvas(image.width, image.height), ctx = surface.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(0, 0, image.width, image.height).data;
        let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 8) opaque++;
        images[layer.id] = image; pixels[layer.id] = { data, width: image.width, height: image.height };
        textureInfo.push({ id: layer.id, runtimeFile: layer.runtimeFile, width: image.width, height: image.height, visiblePixels: opaque });
        if (!opaque) warnings.push(`${layer.id} is fully transparent; verify that this layer is intentionally unused.`);
      }
      assert(textureInfo.find(t => t.id === 'head')?.visiblePixels > 0 && textureInfo.find(t => t.id === 'body')?.visiblePixels > 0, 'Head and body textures must be visible');
      checks.push({ name: 'Every manifest runtime texture decodes with the correct aspect ratio', passed: true });
      composeFaceFrames(images, definition, createCanvas);
      const paintBody = createCanvasBodyPainter(definition);
      const frameFor = (state, extra = {}) => ({ state, time: 0, fullBody: true, motion: false, strength: 1.8, blink: 'open', mouthOpen: false, exploded: false, definition, ...extra });
      const settled = (x = 0, y = 0, exploded = false) => {
        const state = createRigState();
        for (let i = 0; i < 360; i++) advanceRig(state, 0, 1 / 60, true, exploded, 1.8, { lean: x, lift: y, turn: x, nod: y });
        return state;
      };
      // Capture matrices emitted by the renderer. The body callback observes its actual
      // camera, so attachment comparisons do not reproduce the rig's rotation formula.
      const capture = frame => {
        const context = createCanvas(10, 10).getContext('2d'), matrices = {}, drawn = [];
        let camera;
        const proxy = new Proxy(context, { get(target, key) {
          if (key === 'drawImage') return image => {
            if (image === images.headComposite?.image || Object.values(images.faceFrames).includes(image)) {
              matrices.head = copyMatrix(target.getTransform()); drawn.push('face');
              return;
            }
            const id = Object.keys(images).find(k => images[k] === image);
            if (id) { matrices[id] = copyMatrix(target.getTransform()); drawn.push(id); }
          };
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        } });
        drawRig(proxy, 600, 1200, images, frame, ctx => { camera = copyMatrix(ctx.getTransform()); });
        return { matrices, camera, drawn };
      };
      const at = (id, x, y) => {
        const rect = definition.layers[id], p = pixels[id];
        if (!rect || !p || x < rect.x || y < rect.y || x >= rect.x + rect.width || y >= rect.y + rect.height) return 0;
        const ix = clamp(Math.floor((x - rect.x) / rect.width * p.width), 0, p.width - 1);
        const iy = clamp(Math.floor((y - rect.y) / rect.height * p.height), 0, p.height - 1);
        return p.data[(iy * p.width + ix) * 4 + 3];
      };

      check('Rigid face proportions and orthogonal axes under breathing and gesture extremes', () => {
        let samples = 0;
        for (const fullBody of [true, false]) for (const t of [0, 1.3, 2.6, 3.9]) for (const x of [-1, 0, 1]) {
          const state = settled(x, .8), frame = frameFor(state, { time: t, motion: true, fullBody });
          const { matrices, camera } = capture(frame), m = matrices.head;
          assert(m && camera, 'Head or camera was not drawn');
          const scale = Math.hypot(camera.a, camera.b);
          assert(Math.abs(Math.hypot(m.a, m.b) - scale) < 2e-6, 'Face width changed');
          assert(Math.abs(Math.hypot(m.c, m.d) - scale) < 2e-6, 'Face height changed');
          assert(Math.abs(m.a * m.c + m.b * m.d) < 2e-6, 'Face was sheared');
          assert(m.a * m.d - m.b * m.c > 0, 'Face mirrored or collapsed'); samples++;
        }
        stats.faceMatrixSamples = samples;
      });

      check('Shared head/body neck or wrist anchor with local head angle and nod set to zero', () => {
        let maxError = 0;
        assert(rig.headPivot.y <= rig.bodyRigidUntil, 'Head/wrist anchor lies outside the rigid upper body');
        for (const x of [-1, 0, 1]) for (const y of [-1, 1]) for (const t of [0, 1.3, 3.9]) {
          const state = settled(x, y); state.angle.value = 0; state.nod.value = 0;
          const frame = frameFor(state, { time: t, motion: true }), { matrices, camera } = capture(frame);
          const expected = point(camera, deformBodyPoint(rig.headPivot.x, rig.headPivot.y, frame));
          maxError = Math.max(maxError, distance(point(matrices.head, rig.headPivot), expected));
          if (images.handFront) {
            assert(matrices.handFront, 'Foreground hand layer was not drawn');
            maxError = Math.max(maxError, distance(point(matrices.handFront, rig.headPivot), expected));
          }
        }
        stats.maximumAttachmentErrorInCanvasPixels = maxError;
        assert(maxError < .01, `Neck/wrist drifted ${maxError.toFixed(4)} canvas pixels`);
      });

      if (images.handFront && rig.nodGain === 0) check('Foreground hand rotation keeps its wrist pivot on the sleeve', () => {
        for (const x of [-1, 1]) {
          const state = settled(x, .8), frame = frameFor(state), { matrices, camera } = capture(frame);
          const bodyAnchor = point(camera, deformBodyPoint(rig.headPivot.x, rig.headPivot.y, frame));
          assert(distance(point(matrices.handFront, rig.headPivot), bodyAnchor) < .01, 'Raised hand wrist detaches during local head rotation');
        }
      });

      check('Maximum-strength motion stays finite, keeps feet fixed, and does not fold sleeves', () => {
        const stress = createRigState(), idleMotion = createIdleMotion(() => .3); let minJacobian = Infinity, maxFootMotion = 0;
        const samples = [];
        for (const arm of rig.arms) {
          const stepX = Math.max(12, arm.rx / 7), stepY = Math.max(12, arm.ry / 7);
          for (let y = Math.max(0, arm.cy - arm.ry); y <= Math.min(definition.height - 2, arm.cy + arm.ry); y += stepY)
            for (let x = Math.max(0, arm.cx - arm.rx); x <= Math.min(definition.width - 2, arm.cx + arm.rx); x += stepX) samples.push([x, y]);
        }
        // Include torso transitions even when arms are absent or hidden.
        for (let y = rig.bodyRigidUntil; y <= rig.bodyFixedFrom; y += 120)
          for (let x = 0; x < definition.width - 2; x += 120) samples.push([x, y]);
        for (let i = 0; i < 1200; i++) {
          const gesture = advanceIdleMotion(idleMotion, 1 / 60, true, () => (i % 97) / 97);
          advanceRig(stress, i / 60, i === 500 ? 10 : 1 / 60, true, false, 1.8, gesture);
          for (const [id, spring] of Object.entries(stress)) assert(Number.isFinite(spring.value) && Number.isFinite(spring.velocity), `${id} became non-finite at frame ${i}`);
          const frame = frameFor(stress, { time: i / 60, motion: true });
          for (const fraction of [0, .25, .5, .75, 1]) for (const depth of [.001, .35, .8, 1]) {
            const p = { x: definition.width * fraction, y: rig.bodyFixedFrom + (definition.height - rig.bodyFixedFrom) * depth };
            maxFootMotion = Math.max(maxFootMotion, distance(p, deformBodyPoint(p.x, p.y, frame)));
          }
          if (i % 24 === 0) for (const [x, y] of samples) {
            const p = deformBodyPoint(x, y, frame), px = deformBodyPoint(x + 2, y, frame), py = deformBodyPoint(x, y + 2, frame);
            const jacobian = ((px.x - p.x) * (py.y - p.y) - (px.y - p.y) * (py.x - p.x)) / 4;
            assert(Number.isFinite(jacobian), 'Non-finite skin geometry');
            minJacobian = Math.min(minJacobian, jacobian);
          }
        }
        stats.minimumLocalAreaRatio = minJacobian; stats.maximumFixedFootMotion = maxFootMotion; stats.skinProbePoints = samples.length;
        assert(maxFootMotion < 1e-7, `Below-fixed-line points moved by ${maxFootMotion} native pixels`);
        assert(minJacobian > .45, `Skin folds or severely compresses; minimum local area ratio ${minJacobian}`);
        // Exercise the spread spring too; it remains zero during planted-feet checks.
        for (let i = 0; i < 180; i++) {
          advanceRig(stress, i / 60, 1 / 60, true, true, 1.8);
          for (const [id, spring] of Object.entries(stress)) assert(Number.isFinite(spring.value) && Number.isFinite(spring.velocity), `${id} became non-finite while opening exploded view`);
        }
        assert(stress.spread.value > .9, 'Exploded layers did not separate');
        for (let i = 0; i < 900; i++) advanceRig(stress, 0, 1 / 60, false, false, 1.8);
        for (const [id, spring] of Object.entries(stress)) {
          assert(Math.abs(spring.value) < 1e-4 && Math.abs(spring.velocity) < 1e-4, `${id} did not settle at rest`);
        }
      });

      check('Configured visible arms can move independently, without assumptions about hidden hands', () => {
        const outcomes = [];
        for (const arm of rig.arms) {
          const visible = [];
          for (let y = arm.cy - arm.ry * .65; y <= arm.cy + arm.ry * .65; y += Math.max(10, arm.ry / 8))
            for (let x = arm.cx - arm.rx * .65; x <= arm.cx + arm.rx * .65; x += Math.max(10, arm.rx / 8))
              if (at('body', x, y) > 200) visible.push([x, y]);
          if (!visible.length) { outcomes.push({ spring: arm.spring, result: 'No opaque body pixels; movement expectation skipped' }); continue; }
          const state = createRigState(); state[arm.spring].value = .025;
          const frame = frameFor(state);
          const movement = Math.max(...visible.map(([x, y]) => distance({ x, y }, deformBodyPoint(x, y, frame))));
          assert(movement > .1, `${arm.spring} influences visible body pixels but produces no independent motion`);
          const pivot = deformBodyPoint(arm.ex, arm.ey, frame);
          assert(distance(pivot, { x: arm.ex, y: arm.ey }) < 1e-7, `${arm.spring} moves its elbow pivot`);
          outcomes.push({ spring: arm.spring, visibleProbePoints: visible.length, maximumIndependentMotion: movement });
        }
        stats.armChecks = outcomes.length ? outcomes : ['No configured arms; hand movement expectation skipped'];
      });

      check('Blink and mouth textures follow each pose capability', () => {
        const state = createRigState(), active = capture(frameFor(state, { blink: 'closed', mouthOpen: true })).drawn;
        assert(active.includes('face') && !active.includes('mouth') && !active.includes('eyesClosed'), 'Assembled face must draw once on a shared pixel grid');
        const exploded = capture(frameFor(settled(0, 0, true), { exploded: true, blink: 'closed', mouthOpen: true })).drawn;
        assert(exploded.includes(rig.blink ? 'eyesClosed' : 'eyesOpen'), 'Unexpected eye texture for pose capability');
        assert(exploded.includes(rig.mouth ? 'mouth' : 'mouthClosed'), 'Unexpected mouth texture for pose capability');
        if (rig.blink) assert(digest(pixels.eyesOpen.data) !== digest(pixels.eyesClosed.data), 'Blink enabled but open and closed textures are identical');
        if (rig.mouth) assert(digest(pixels.mouth.data) !== digest(pixels.mouthClosed.data), 'Mouth enabled but open and closed textures are identical');
      });

      const stages = [
        { label: 'Rest', x: 0, y: 0 },
        { label: 'Extreme left', x: -1, y: 1 },
        { label: 'Extreme right', x: 1, y: -1 },
        { label: 'Exploded layers', x: 0, y: 0, exploded: true },
        ...(rig.blink ? [{ label: 'Eyes closed', x: 0, y: 0, blink: 'closed' }] : []),
        ...(rig.mouth ? [{ label: 'Mouth open', x: 0, y: 0, mouthOpen: true }] : []),
      ];
      const tileW = 360, tileH = 680, top = 65, sheet = createCanvas(stages.length * tileW, top + tileH * 2 + 38), c = sheet.getContext('2d');
      c.fillStyle = '#14222b'; c.fillRect(0, 0, sheet.width, sheet.height);
      c.fillStyle = '#edf3f4'; c.font = 'bold 22px sans-serif'; c.fillText(`${pose} • strength 1.8 • full body / upper body`, 20, 28);
      const sheetPaths = [];
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i], state = settled(stage.x, stage.y, Boolean(stage.exploded));
        c.fillStyle = '#c6d8df'; c.font = '17px sans-serif'; c.fillText(stage.label, i * tileW + 18, 54);
        for (const [row, fullBody] of [[0, true], [1, false]]) {
          const tile = createCanvas(tileW, tileH), ctx = tile.getContext('2d');
          const frame = frameFor(state, { fullBody, exploded: Boolean(stage.exploded), blink: stage.blink || 'open', mouthOpen: Boolean(stage.mouthOpen) });
          drawRig(ctx, tileW, tileH, images, frame, paintBody);
          const data = ctx.getImageData(0, 0, tileW, tileH).data;
          check(`Visible ${fullBody ? 'full body' : 'upper body'} render: ${stage.label}`, () => assert(data.some((v, index) => index % 4 === 3 && v > 8), 'No visible rendered pixels'));
          c.drawImage(tile, i * tileW, top + row * tileH);
        }
      }
      const review = path.join(opt.out, `all-poses-${pose}-review.png`); sheetPaths.push(review);
      c.fillStyle = '#c6d8df'; c.font = '14px sans-serif';
      // Write the status into the sheet after its scenes; keep failures reviewable.
      c.fillText(checks.every(check => check.passed) ? 'Numeric checks passed. Inspect neck, wrist, hair and eye boundaries.' : 'Numeric check failure — see all-poses-report.json.', 20, sheet.height - 12);
      fs.writeFileSync(review, sheet.toBuffer('image/png'));
      report.poses[pose] = { source: manifest.source, dimensions: [definition.width, definition.height], capabilities: { blink: rig.blink, mouth: rig.mouth, arms: rig.arms.length, foregroundHand: Boolean(images.handFront) }, textures: textureInfo, checks, warnings, stats, reviewSheets: sheetPaths };
      console.log(`${checks.every(check => check.passed) ? 'PASS' : 'FAIL'} ${pose}: ${manifest.layers.length} textures; ${checks.filter(check => check.passed).length}/${checks.length} checks; ${review}`);
    } catch (error) {
      report.failures.push(`${pose}: ${error.message}`);
      report.poses[pose] = { checks, warnings, stats, fatalError: error.stack || error.message };
      console.error(`FAIL ${pose}: ${error.message}`);
    }
  }
  const reportPath = path.join(opt.out, 'all-poses-report.json'); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (report.failures.length) { console.error(report.failures.join('\n')); process.exitCode = 1; }
  console.log(`Report: ${reportPath}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
