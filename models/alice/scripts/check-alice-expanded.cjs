/** Exercise the shipped expression compositor and produce a nine-pose overview. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createCanvas, loadImage, GlobalFonts } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const fontPath = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, 'Alice Review');
require('node:module').registerHooks({ resolve(specifier, context, next) {
  return next(specifier.startsWith('./alice-') && !specifier.endsWith('.ts') ? `${specifier}.ts` : specifier, context);
} });
const { ALICE_MODELS } = require('../alice-models.ts');
const modelIndex = process.argv.indexOf('--model');
const model = modelIndex < 0 ? 'winter' : process.argv[modelIndex + 1];
assert(ALICE_MODELS[model], 'Unknown model');
const ALICE_POSES = ALICE_MODELS[model].poses;
const assetRoot = path.resolve('public', ALICE_MODELS[model].assetBase);
const pixels = image => {
  const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height).data;
};
const names = { idle: '常态', thinking: '托腮', front: '正面交手', shy: '前倾', relaxed: '正面垂手', side: '侧身垂手', 'side-folded': '侧身收手', profile: '侧脸', leaning: '前倾抱臂', 'hand-over-mouth': '掩嘴', tea: '端茶' };
(async () => {
  const { definitionFromManifest } = await import(pathToFileURL(path.resolve('models/alice/alice-rig-assets.ts')));
  const { composeFaceFrames } = await import(pathToFileURL(path.resolve('models/alice/alice-face.ts')));
  const { createRigState, drawRig } = await import(pathToFileURL(path.resolve('models/alice/alice-rig.ts')));
  const { createCanvasBodyPainter } = await import(pathToFileURL(path.resolve('models/alice/alice-body.ts')));
  const output = path.resolve(model === 'winter' ? 'work/alice/source-expansion' : `work/alice/${model}`); fs.mkdirSync(output, { recursive: true });
  const sheet = createCanvas(1440, Math.ceil(ALICE_POSES.length / 3) * 590), ctx = sheet.getContext('2d');
  const faces = createCanvas(1440, ALICE_POSES.length * 285), fc = faces.getContext('2d');
  ctx.fillStyle = '#18202e'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  fc.fillStyle = '#4e5869'; fc.fillRect(0, 0, faces.width, faces.height);
  const report = {};
  for (const [index, pose] of ALICE_POSES.entries()) {
    const root = path.resolve(assetRoot, 'layers', pose === 'idle' ? '' : pose);
    const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`));
    const definition = definitionFromManifest(manifest), head = definition.layers.head;
    const images = Object.fromEntries(await Promise.all(manifest.layers.map(async l => [l.id, await loadImage(`${root}/${l.runtimeFile}`)])));
    composeFaceFrames(images, definition, createCanvas);
    const neutral = images.faceFrames['open-rest'];
    const base = pixels(images.headRest), rest = pixels(neutral);
    let neutralError = 0;
    for (let i = 0; i < rest.length; i++) if (base[(i & ~3) + 3] === 255) neutralError = Math.max(neutralError, Math.abs(rest[i] - base[i]));
    assert(neutralError <= 1, `${pose}: original resting face changed`);
    const expressionChecks = {};
    for (const [key, layer, enabled] of [
      ['closed-rest', 'eyesClosed', definition.rig.blink],
      ['open-talk', 'mouth', definition.rig.mouth],
    ]) {
      const image = images.faceFrames[key], data = pixels(image), r = definition.layers[layer];
      if (!enabled) { assert.equal(image, neutral, `${pose}: unsupported expression must reuse the neutral face`); continue; }
      let changed = 0, outside = 0;
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        if (Math.max(...[0, 1, 2, 3].map(c => Math.abs(data[i + c] - rest[i + c]))) <= 5) continue;
        changed++;
        const nx = head.x + (x + .5) * head.width / image.width;
        const ny = head.y + (y + .5) * head.height / image.height;
        if (nx < r.x - 2 || nx > r.x + r.width + 2 || ny < r.y - 2 || ny > r.y + r.height + 2) outside++;
      }
      assert(changed > 20, `${pose}: ${key} has no visible expression difference`);
      assert.equal(outside, 0, `${pose}: ${key} changes pixels outside its feature region`);
      expressionChecks[key] = { changed, outside };
    }
    const fallback = await loadImage(path.resolve(assetRoot, `${pose}.webp`));
    assert(Math.abs(fallback.width / fallback.height - manifest.width / manifest.height) < .001, `${pose}: fallback sprite is distorted`);
    const tile = createCanvas(420, 535), tc = tile.getContext('2d');
    const frame = { state: createRigState(), time: 0, fullBody: false, motion: false, strength: 1.15, blink: 'open', mouthOpen: false, exploded: false, definition };
    drawRig(tc, tile.width, tile.height, images, frame, createCanvasBodyPainter(definition));
    if (model === 'winter' && pose === 'thinking') {
      // Compare the final head (including hair) with the native eye patch.
      // Checking faceFrames alone misses old eyelashes stranded in a hair layer.
      const composite = images.headComposite, r = composite.layer;
      const expected = createCanvas(composite.image.width, composite.image.height), ec = expected.getContext('2d');
      ec.drawImage(composite.image, 0, 0);
      const eye = definition.layers.eyesOpen, rx = expected.width / r.width, ry = expected.height / r.height;
      ec.drawImage(images.eyesOpen, (eye.x - r.x) * rx, (eye.y - r.y) * ry, eye.width * rx, eye.height * ry);
      const actual = pixels(composite.image), reference = pixels(expected);
      let ghostPixels = 0;
      for (let y = Math.ceil((555 - r.y) * ry); y < (645 - r.y) * ry; y++)
        for (let x = Math.ceil((450 - r.x) * rx); x < (565 - r.x) * rx; x++) {
          const i = (y * expected.width + x) * 4;
          if (Math.max(...[0, 1, 2].map(c => Math.abs(actual[i + c] - reference[i + c]))) > 40) ghostPixels++;
        }
      assert(ghostPixels < 10, `thinking: ${ghostPixels} old eyelash pixels overlap the native open eye`);
    }
    const x = index % 3 * 480, y = Math.floor(index / 3) * 590;
    ctx.fillStyle = '#252e40'; ctx.fillRect(x + 12, y + 12, 456, 565);
    ctx.drawImage(tile, x + 30, y + 37);
    ctx.fillStyle = '#f4f5ff'; ctx.font = '23px "Alice Review", sans-serif'; ctx.fillText(names[pose], x + 30, y + 44);
    ctx.fillStyle = '#a5b1c7'; ctx.font = '16px sans-serif'; ctx.fillText(pose, x + 30, y + 67);
    const eye = definition.layers.eyesOpen, mouth = definition.layers.mouth;
    const view = { x: eye.x - 30, y: eye.y - 25, width: eye.width + 60, height: mouth.y + mouth.height + 28 - eye.y + 25 };
    for (const [col, key] of ['open-rest', 'closed-rest', 'open-talk'].entries()) {
      const surface = images.headComposite;
      surface.paint({ ...frame, blink: key === 'closed-rest' ? 'closed' : 'open', mouthOpen: key === 'open-talk' });
      const r = surface.layer, rx = surface.image.width / r.width, ry = surface.image.height / r.height;
      const scale = Math.min(445 / view.width, 238 / view.height);
      fc.drawImage(surface.image, (view.x - r.x) * rx, (view.y - r.y) * ry, view.width * rx, view.height * ry, col * 480 + 20, index * 285 + 37, view.width * scale, view.height * scale);
      fc.fillStyle = '#fff'; fc.font = '18px sans-serif'; fc.fillText(`${pose} / ${key}`, col * 480 + 20, index * 285 + 27);
    }
    report[pose] = { neutralError, blink: definition.rig.blink, mouth: definition.rig.mouth, expressions: expressionChecks };
  }
  fs.writeFileSync(`${output}/model-overview.png`, sheet.toBuffer('image/png'));
  fs.writeFileSync(`${output}/expression-review.png`, faces.toBuffer('image/png'));
  fs.writeFileSync(`${output}/expression-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: ${ALICE_POSES.length} neutral faces, supported expression boundaries, unsupported-state fallback and sprite aspect ratios.`);
})();
