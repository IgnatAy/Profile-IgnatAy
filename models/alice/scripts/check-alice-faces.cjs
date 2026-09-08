/** Verify the actual precomposed runtime faces and render a close-up review. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createCanvas, loadImage } = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
require('node:module').registerHooks({ resolve(specifier, context, next) {
  return next(/^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier, context);
} });
const views = { idle: [430, 470, 450, 355], thinking: [425, 480, 450, 355], front: [490, 470, 450, 355], shy: [100, 505, 450, 355] };
const pixels = image => {
  const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0); return ctx.getImageData(0, 0, image.width, image.height).data;
};
(async () => {
  const { definitionFromManifest } = await import(pathToFileURL(path.resolve('models/alice/alice-rig-assets.ts')));
  const { composeFaceFrames } = await import(pathToFileURL(path.resolve('models/alice/alice-face.ts')));
  const sheet = createCanvas(1350, 4 * 405), ctx = sheet.getContext('2d');
  ctx.fillStyle = '#23333c'; ctx.fillRect(0, 0, sheet.width, sheet.height);
  const report = {};
  for (const [row, pose] of Object.keys(views).entries()) {
    const base = path.resolve('public/models/alice/layers', pose === 'idle' ? '' : pose);
    const manifest = JSON.parse(fs.readFileSync(`${base}/manifest.json`));
    const definition = definitionFromManifest(manifest), head = definition.layers.head, mouth = definition.layers.mouth;
    // The shared compositor also prepares hair; load its actual runtime inputs.
    const images = Object.fromEntries(await Promise.all(manifest.layers.map(async l => [l.id, await loadImage(`${base}/${l.runtimeFile}`)])));
    composeFaceFrames(images, definition, createCanvas);
    assert(definition.rig.mouth, `${pose}: talking disabled`);
    assert(images.headRest && images.headTalk, `${pose}: unified face assets missing`);
    const restImage = images.faceFrames['open-rest'], rest = pixels(restImage), talk = pixels(images.faceFrames['open-talk']);
    const source = pixels(images.headRest);
    // Transparent RGB can round differently after premultiplication. The
    // opaque face, including the old feature rectangle boundaries, must match.
    let neutralMaxDelta = 0;
    for (let i = 0; i < rest.length; i++) if (source[(i & ~3) + 3] === 255) neutralMaxDelta = Math.max(neutralMaxDelta, Math.abs(rest[i] - source[i]));
    assert(neutralMaxDelta <= 1, `${pose}: neutral face delta ${neutralMaxDelta}`);
    let changed = 0, outside = 0, border = 0;
    const rx = restImage.width / head.width, ry = restImage.height / head.height;
    for (let y = 0; y < restImage.height; y++) for (let x = 0; x < restImage.width; x++) {
      const i = (y * restImage.width + x) * 4;
      if (!rest.subarray(i, i + 4).some((v, c) => v !== talk[i + c])) continue;
      changed++;
      const nx = head.x + (x + .5) / rx, ny = head.y + (y + .5) / ry;
      if (nx < mouth.x || nx > mouth.x + mouth.width || ny < mouth.y || ny > mouth.y + mouth.height) outside++;
      if (nx < mouth.x + 2 || nx > mouth.x + mouth.width - 2 || ny < mouth.y + 2 || ny > mouth.y + mouth.height - 2) border++;
      assert(rest[i + 3] === 255 && talk[i + 3] === 255, `${pose}: transparent mouth seam`);
    }
    assert(changed > 60, `${pose}: speaking frame does not visibly change`);
    assert(outside === 0 && border === 0, `${pose}: speaking alters the mouth rectangle boundary`);
    const inkBounds = image => {
      const data = pixels(image), xs = [], ys = [];
      for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
        const i = (y * image.width + x) * 4;
        if (data[i + 3] > 127 && Math.max(data[i], data[i + 1], data[i + 2]) < 200) { xs.push(x); ys.push(y); }
      }
      return { width: Math.max(...xs) - Math.min(...xs) + 1, height: Math.max(...ys) - Math.min(...ys) + 1 };
    };
    const closed = inkBounds(images.mouthClosed), open = inkBounds(images.mouth);
    assert([closed.width, closed.height, open.width, open.height].every(v => Number.isFinite(v) && v > 0), `${pose}: empty mouth ink`);
    if (pose === 'thinking' || pose === 'shy') assert(open.height >= closed.height * 3, `${pose}: mouth opening still too small`);
    report[pose] = { changedPixels: changed, changedBoundaryPixels: border, closedInk: closed, openInk: open };
    for (const [col, key] of ['open-rest', 'open-talk', 'closed-talk'].entries()) {
      const [vx, vy, vw, vh] = views[pose];
      ctx.fillStyle = '#edf5f6'; ctx.font = '18px sans-serif'; ctx.fillText(`${pose} / ${key}`, col * 450 + 14, row * 405 + 27);
      ctx.drawImage(images.faceFrames[key], (vx - head.x) * rx, (vy - head.y) * ry, vw * rx, vh * ry, col * 450, row * 405 + 45, 450, 355);
    }
  }
  fs.mkdirSync('work/alice', { recursive: true });
  fs.writeFileSync('work/alice/unified-face-review.png', sheet.toBuffer('image/png'));
  fs.writeFileSync('work/alice/unified-face-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(report);
})().catch(error => { console.error(error); process.exitCode = 1; });
