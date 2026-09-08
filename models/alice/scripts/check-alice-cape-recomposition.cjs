/* oxlint-disable typescript/no-require-imports -- Offline CommonJS image regression script. */
const fs = require('node:fs'),
  path = require('node:path'),
  assert = require('node:assert/strict');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const { insidePolygon } = require('./prepare-alice-pendants.cjs');
const OUT =
    process.env.ALICE_CAPE_OUTPUT_DIR ||
    path.resolve('public/models/alice-cape'),
  WORK = process.env.ALICE_CAPE_REVIEW_DIR || path.resolve('work/alice/cape'),
  SRC = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/4';
fs.mkdirSync(WORK, { recursive: true });
(async () => {
  const reports = [];
  for (const pose of [
    'idle',
    'relaxed',
    'side',
    'side-folded',
    'profile',
    'shy',
    'leaning',
  ]) {
    const root = path.join(OUT, 'layers', pose === 'idle' ? '' : pose),
      m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
    const list = [
      'backing',
      'body',
      ...(m.rig.pendants ?? []).map((pendant) => pendant.layer),
      'headRest',
      'hairLeft',
      'hairRight',
      'bow',
    ];
    const layers = await Promise.all(
      list.map(async (id) => {
        const l = m.layers.find((layer) => layer.id === id);
        let input = path.join(root, l.file);
        const clip = m.rig.pendants?.find((p) => p.layer === id)?.clip;
        if (clip) {
          // Apply the neutral occlusion matte before source-pixel comparison.
          const raw = await sharp(input).ensureAlpha().raw().toBuffer();
          const points = clip.map((p) => [p.x, p.y]);
          for (let y = 0; y < l.height; y++)
            for (let x = 0; x < l.width; x++)
              if (!insidePolygon(points, l.left + x, l.top + y))
                raw[(y * l.width + x) * 4 + 3] = 0;
          input = await sharp(raw, {
            raw: { width: l.width, height: l.height, channels: 4 },
          })
            .png()
            .toBuffer();
        }
        return { input, left: l.left, top: l.top };
      }),
    );
    const composite = await sharp({
      create: {
        width: m.width,
        height: m.height,
        channels: 4,
        background: '#00000000',
      },
    })
      .composite(layers)
      .png()
      .toBuffer();
    const A = await sharp(path.join(SRC, m.source))
        .ensureAlpha()
        .raw()
        .toBuffer(),
      B = await sharp(composite).ensureAlpha().raw().toBuffer();
    let changedPixels = 0,
      maxDelta = 0,
      changedAlpha = 0,
      changedOpaque = 0,
      unexpectedOpaque = 0,
      missingSourcePixels = 0,
      addedPixels = 0,
      gt1 = 0;
    const dif = Buffer.alloc(A.length);
    for (let i = 0; i < A.length; i += 4) {
      let diff = 0;
      for (let c = 0; c < 4; c++) {
        if (c < 3 && !A[i + 3] && !B[i + 3]) continue;
        diff = Math.max(diff, Math.abs(A[i + c] - B[i + c]));
      }
      if (diff) {
        changedPixels++;
        maxDelta = Math.max(maxDelta, diff);
        if (diff > 1) gt1++;
        dif[i] = 255;
        dif[i + 3] = 255;
      }
      if (A[i + 3] !== B[i + 3]) changedAlpha++;
      if (diff && A[i + 3] === 255) {
        changedOpaque++;
        const x = (i / 4) % m.width,
          y = Math.floor(i / 4 / m.width);
        if (
          !(m.rig.pendants ?? []).some((p) => {
            const rect = m.layers.find((layer) => layer.id === p.layer);
            return (
              x >= rect.left &&
              x < rect.left + rect.width &&
              y >= rect.top &&
              y < rect.top + rect.height
            );
          })
        )
          unexpectedOpaque++;
      }
      if (A[i + 3] && !B[i + 3]) missingSourcePixels++;
      if (!A[i + 3] && B[i + 3]) addedPixels++;
    }
    const h = m.layers.find((l) => l.id === 'headRest'),
      box = { left: h.left, top: 620, width: h.width, height: h.height - 620 };
    await sharp(composite)
      .extract(box)
      .flatten({ background: '#d8d2cc' })
      .png()
      .toFile(path.join(WORK, pose + '-recomposed-neck.png'));
    const faceRows = [];
    for (const [blink, mouth] of [
      ['eyesOpen', 'mouthClosed'],
      ['eyesClosed', 'mouthClosed'],
      ['eyesOpen', 'mouth'],
    ]) {
      const layers = ['headRest', blink, mouth, 'hairLeft', 'hairRight', 'bow'];
      const c = await sharp({
        create: {
          width: h.width,
          height: h.height,
          channels: 4,
          background: '#00000000',
        },
      })
        .composite(
          layers.map((id) => {
            const l = m.layers.find((layer) => layer.id === id);
            return {
              input: path.join(root, l.file),
              left: l.left - h.left,
              top: l.top - h.top,
            };
          }),
        )
        .png()
        .toBuffer();
      faceRows.push({
        input: await sharp(c)
          .extract({
            left: 0,
            top: 450,
            width: h.width,
            height: h.height - 450,
          })
          .resize({
            width: 400,
            height: 330,
            fit: 'contain',
            background: '#d8d2cc',
          })
          .png()
          .toBuffer(),
        left: faceRows.length * 400,
        top: 0,
      });
    }
    await sharp({
      create: { width: 1200, height: 330, channels: 4, background: '#d8d2cc' },
    })
      .composite(faceRows)
      .png()
      .toFile(path.join(WORK, pose + '-expressions.png'));
    const r = {
      pose,
      width: m.width,
      height: m.height,
      changedPixels,
      maxDelta,
      changedAlpha,
      changedOpaque,
      unexpectedOpaque,
      missingSourcePixels,
      addedPixels,
      changedPixelsOver1: gt1,
    };
    reports.push(r);
    console.log(r);
    assert.equal(missingSourcePixels, 0);
    assert.equal(addedPixels, 0);
    assert.equal(changedAlpha, 0);
    assert.equal(unexpectedOpaque, 0);
    assert(maxDelta <= 1);
  }
  fs.writeFileSync(
    path.join(WORK, 'neutral-recomposition-report.json'),
    JSON.stringify(reports, null, 2),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
