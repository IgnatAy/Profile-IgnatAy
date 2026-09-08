import assert from 'node:assert/strict';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { createCanvas, loadImage } from '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';

registerHooks({
  resolve(specifier, context, next) {
    return next(/^\.\/alice-[^.]+$/.test(specifier)
      ? `${specifier}.ts` : specifier, context);
  },
});
const { ALICE_MODELS } = await import('../models/alice/alice-models.ts');
const { definitionFromManifest } = await import('../models/alice/alice-rig-assets.ts');
const { createRigState, drawRig } = await import('../models/alice/alice-rig.ts');
const { composeFaceFrames } = await import('../models/alice/alice-face.ts');
const { createCanvasBodyPainter } = await import('../models/alice/alice-body.ts');
const { aliceFraming, aliceNeedsWidePortrait, aliceSpriteCenterRatio } = await import('../models/alice/alice-framing.ts');
const { getAliceExpressions } = await import('../models/alice/alice-expressions.ts');
const scenarios = [
  { name: 'desktop', width: 380, height: 650 },
  { name: 'desktop-reveal', width: 380, height: 890, portraitHeight: 650 },
  { name: 'laptop', width: 300, height: 480 },
  { name: 'mobile', width: 150, height: 222 },
  { name: 'landscape', width: 180, height: 320 },
  { name: 'full-body', width: 180, height: 320, fullBody: true },
];
const out = path.resolve('work/alice/framing');
await mkdir(out, { recursive: true });
const failures = [];
let frames = 0, manifests = 0;
const motionStates = [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]];
const transparent = await loadImage(createCanvas(1, 1).toBuffer('image/png'));
for (const [model, config] of Object.entries(ALICE_MODELS)) {
  const previousFailures = failures.length;
  const root = path.resolve('public', config.assetBase);
  // Include independent full-body expression rigs, not just named poses.
  const files = (await readdir(root, { recursive: true }))
    .filter((file) => file.endsWith('manifest.json')).sort();
  const sheet = createCanvas(files.length * 190, 390);
  const review = sheet.getContext('2d');
  review.fillStyle = '#ebe6f2'; review.fillRect(0, 0, sheet.width, sheet.height);
  for (const [index, file] of files.entries()) {
    const manifest = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    const definition = definitionFromManifest(manifest);
    const images = composeFaceFrames(Object.fromEntries(await Promise.all(
      manifest.layers.map(async (layer) => [layer.id,
        await loadImage(path.join(root, path.dirname(file), layer.runtimeFile))]),
    )), definition, createCanvas);
    const paintBody = createCanvasBodyPainter(definition);
    const directory = path.dirname(file);
    const pose = config.poses.find((candidate) =>
      (candidate === 'idle' ? 'layers' : `layers/${candidate}`) === directory ||
      getAliceExpressions(model, candidate).some((expression) => expression.rigDirectory === directory));
    assert.ok(pose, `${model}/${file}: rig belongs to a displayed pose`);
    if (config.poses.includes(pose)) assert.ok(Math.abs(
      aliceSpriteCenterRatio(model, pose) - (definition.rig.portraitCenterX ?? definition.width / 2) / definition.width,
    ) < .00001, `${model}/${pose}: sprite and rig centers match`);
    // Isolate the bottom quarter of the original body. This includes shoes and
    // boots for every outfit; render it through the real body deformation below.
    const feet = createCanvas(images.body.width, images.body.height);
    const feetCtx = feet.getContext('2d');
    feetCtx.beginPath(); feetCtx.rect(0, feet.height * .76, feet.width, feet.height);
    feetCtx.clip(); feetCtx.drawImage(images.body, 0, 0);
    // Decode an immutable texture: drawing a mutable canvas thousands of times
    // through the triangle painter would retain a snapshot for each triangle.
    const footImages = { ...images, body: await loadImage(feet.toBuffer('image/png')), backing: transparent };
    feet.width = feet.height = 1;
    for (const scenario of scenarios) for (const [direction, trailing] of motionStates) {
      const state = createRigState();
      // Exercise the hard limits, beyond ordinary idle amplitudes.
      for (const [key, limit] of Object.entries({ torso: .13, angle: .038,
        nod: 5, armFront: .04, armBack: .04, bow: .018,
        left: .22, right: .22, leftTip: .3, rightTip: .3,
        leftFlutter: .065, rightFlutter: .065, pomLeft: .065, pomRight: .055 }))
        state[key].value = direction * limit;
      for (const key of ['armFront', 'armBack', 'left', 'right', 'leftTip', 'rightTip',
        'leftFlutter', 'rightFlutter', 'pomLeft', 'pomRight'])
        state[key].value *= direction * trailing;
      const { height } = scenario;
      const width = aliceNeedsWidePortrait(model, pose) && !scenario.fullBody
        ? scenario.width * 2 : scenario.width;
      const viewport = { ...scenario, width, portraitWidth: scenario.width };
      // Draw onto an oversized surface with the real viewport transform.
      // A normal canvas hides the evidence of clipping outside its own edges.
      const padding = 160;
      const canvas = createCanvas(width + padding * 2, height);
      const ctx = canvas.getContext('2d');
      ctx.translate(padding, 0);
      drawRig(ctx, width, height, images, { state, time: 1.3, motion: true,
        strength: 1.8, blink: 'open', mouthOpen: true, exploded: false,
        fullBody: false, ...viewport, definition }, paintBody);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let escaped = 0, visible = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] <= 2) continue;
        if (x < padding + 2 || x >= padding + width - 2) escaped++;
        else visible++;
      }
      const label = `${model}/${file}: ${scenario.name}/${direction}/${trailing}`;
      if (!visible || escaped) failures.push({ label, escaped, visible });
      if (!scenario.fullBody) {
        const geometry = aliceFraming(width, height, definition, false, scenario.portraitHeight, scenario.width);
        const original = aliceFraming(scenario.width, height, definition, false, scenario.portraitHeight);
        assert.equal(geometry.scale, original.scale, `${label}: preserve portrait size`);
        assert.equal(geometry.top, original.top, `${label}: preserve vertical framing`);
        assert.ok(geometry.top + definition.height * .76 * geometry.scale > height,
          `${label}: lower legs must be below the viewport`);
        const footCanvas = createCanvas(width, height), footCtx = footCanvas.getContext('2d');
        footCtx.translate(geometry.left, geometry.top); footCtx.scale(geometry.scale, geometry.scale);
        paintBody(footCtx, footImages, { state, time: 1.3, motion: true,
          strength: 1.8, blink: 'open', mouthOpen: true, exploded: false,
          fullBody: false, definition });
        const footPixels = footCtx.getImageData(0, 0, width, height).data;
        let exposedFeet = 0;
        for (let i = 3; i < footPixels.length; i += 4) if (footPixels[i] > 2) exposedFeet++;
        if (exposedFeet) failures.push({ label, exposedFeet });
      }
      if (scenario.name === 'landscape' && direction === 0) {
        review.drawImage(canvas, padding, 0, width, height, index * 190 + 5, 40, scenario.width, height);
        review.fillStyle = '#30243c'; review.font = '12px sans-serif';
        review.fillText(path.dirname(file).replace('layers/', ''), index * 190 + 5, 22);
      }
      frames++;
    }
    manifests++;
  }
  await writeFile(path.join(out, `${model}.png`), sheet.toBuffer('image/png'));
  console.log(`${failures.length === previousFailures ? 'PASS' : 'FAIL'} ${model}: ${files.length} rigs, ${files.length * scenarios.length * motionStates.length} viewport/pose combinations`);
}
await writeFile(path.join(out, 'report.json'), JSON.stringify({ manifests, frames, failures,
  limitation: 'Offline Canvas rendering; browser WebGL/CSS not exercised.' }, null, 2));
assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
console.log(`PASS: all ${frames} frames preserve portrait size, keep companion feet hidden and show complete side silhouettes.`);
