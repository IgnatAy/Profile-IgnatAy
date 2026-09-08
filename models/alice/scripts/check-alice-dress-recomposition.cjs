/** Independently validate native neutral PNG reconstruction against untouched supplied PNGs.
 * Run: node models/alice/scripts/check-alice-dress-recomposition.cjs [generated-layers-root] [source-dir] [report-dir] [pose,pose,...]
 * Exit 0 requires all requested poses, exact alpha/coverage, and opaque RGB differences <=1.
 * Only writes inside report-dir. No source or generated asset is changed. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset regression script. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const root =
  process.argv[2] || path.resolve('public/models/alice-dress/layers');
const sourceDir = process.argv[3] || '/Users/1gnat4y/Desktop/立绘/3';
const out = process.argv[4] || path.resolve('work/alice/dress/recomposition');
const poses = process.argv[5]?.split(',') || [
  'idle',
  'thinking',
  'relaxed',
  'hand-over-mouth',
  'side',
  'side-folded',
  'shy',
  'tea',
];
const order = ['backing', 'body', 'headRest', 'hairLeft', 'hairRight', 'bow'];
const bound = () => ({
  count: 0,
  left: Infinity,
  top: Infinity,
  right: -1,
  bottom: -1,
});
function mark(b, x, y) {
  b.count++;
  b.left = Math.min(b.left, x);
  b.right = Math.max(b.right, x);
  b.top = Math.min(b.top, y);
  b.bottom = Math.max(b.bottom, y);
}
function summarize(b) {
  return {
    count: b.count,
    box: b.count
      ? {
          left: b.left,
          top: b.top,
          width: b.right - b.left + 1,
          height: b.bottom - b.top + 1,
        }
      : null,
  };
}
const load = async (input) =>
  sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const reports = [];
  for (const pose of poses) {
    const dir = pose === 'idle' ? root : path.join(root, pose);
    const mf = path.join(dir, 'manifest.json');
    if (!fs.existsSync(mf)) {
      reports.push({ pose, pass: false, error: `Missing ${mf}` });
      continue;
    }
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    const srcPath = path.join(sourceDir, m.source);
    const original = await load(srcPath);
    const { width: W, height: H } = original.info;
    if (W !== m.width || H !== m.height)
      throw new Error(`${pose}: manifest/source dimensions differ`);
    const layers = [];
    for (const id of order) {
      const spec = m.layers.find((l) => l.id === id);
      if (!spec) throw new Error(`${pose}: missing layer ${id}`);
      const file = path.join(dir, spec.file),
        meta = await sharp(file).metadata();
      if (meta.width !== spec.width || meta.height !== spec.height)
        throw new Error(`${pose}/${id}: PNG/manifest dimensions differ`);
      if (
        spec.left < 0 ||
        spec.top < 0 ||
        spec.left + spec.width > W ||
        spec.top + spec.height > H
      )
        throw new Error(`${pose}/${id}: layer outside original canvas`);
      layers.push({ input: file, left: spec.left, top: spec.top });
    }
    const recomposed = await sharp({
      create: {
        width: W,
        height: H,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(layers)
      .png()
      .toBuffer();
    const pngPath = path.join(out, `${pose}-recomposed.png`);
    fs.writeFileSync(pngPath, recomposed);
    const result = await load(recomposed),
      a = original.data,
      b = result.data;
    const lost = bound(),
      added = bound(),
      alpha = bound(),
      rgb = bound(),
      anyRgb = bound(),
      rounding = bound();
    let sourcePixels = 0,
      resultPixels = 0,
      maxOpaqueRgbDelta = 0,
      maxAlphaDelta = 0,
      maxVisibleRgbDelta = 0;
    const diagnostic = Buffer.alloc(W * H * 4),
      samples = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4,
          sa = a[i + 3],
          ra = b[i + 3];
        if (sa) sourcePixels++;
        if (ra) resultPixels++;
        let color = null;
        if (sa && !ra) {
          mark(lost, x, y);
          color = [255, 30, 30];
        }
        if (!sa && ra) {
          mark(added, x, y);
          color = [30, 90, 255];
        }
        if (sa !== ra) {
          mark(alpha, x, y);
          maxAlphaDelta = Math.max(maxAlphaDelta, Math.abs(sa - ra));
          color ||= [255, 150, 0];
        }
        const rd = Math.max(
          Math.abs(a[i] - b[i]),
          Math.abs(a[i + 1] - b[i + 1]),
          Math.abs(a[i + 2] - b[i + 2]),
        );
        if (sa) {
          maxVisibleRgbDelta = Math.max(maxVisibleRgbDelta, rd);
          if (rd > 1) mark(anyRgb, x, y);
        }
        if (sa === 255) {
          maxOpaqueRgbDelta = Math.max(maxOpaqueRgbDelta, rd);
          if (rd > 1) {
            mark(rgb, x, y);
            color ||= [230, 0, 230];
          } else if (rd) mark(rounding, x, y);
        }
        if (color) {
          diagnostic[i] = color[0];
          diagnostic[i + 1] = color[1];
          diagnostic[i + 2] = color[2];
          diagnostic[i + 3] = 255;
          if (samples.length < 12)
            samples.push({
              x,
              y,
              source: [...a.subarray(i, i + 4)],
              result: [...b.subarray(i, i + 4)],
            });
        }
      }
    const pass =
      lost.count === 0 &&
      added.count === 0 &&
      alpha.count === 0 &&
      rgb.count === 0;
    const report = {
      pose,
      pass,
      source: m.source,
      dimensions: [W, H],
      layerOrder: order,
      sourcePixels,
      resultPixels,
      lost: summarize(lost),
      added: summarize(added),
      alphaMismatch: summarize(alpha),
      opaqueRgbMismatchOver1: summarize(rgb),
      opaqueRgbRounding1: summarize(rounding),
      visibleRgbMismatchOver1: summarize(anyRgb),
      maxAlphaDelta,
      maxOpaqueRgbDelta,
      maxVisibleRgbDelta,
      failureSamples: samples,
      recomposed: pngPath,
    };
    const diffFile = path.join(out, `${pose}-diff.png`);
    await sharp(diagnostic, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toFile(diffFile);
    const hb = m.layers.find((l) => l.id === 'headRest');
    const crop = {
      left: Math.max(0, hb.left - 100),
      top: 0,
      width: Math.min(W, hb.left + hb.width + 100) - Math.max(0, hb.left - 100),
      height: Math.min(H, hb.height + 150),
    };
    const panels = [];
    for (const [index, input] of [srcPath, pngPath, diffFile].entries()) {
      const im = await sharp(input)
        .extract(crop)
        .flatten({ background: index === 2 ? '#252530' : '#dededc' })
        .png()
        .toBuffer();
      panels.push({ input: im, left: crop.width * index, top: 0 });
    }
    const seamSheet = await sharp({
      create: {
        width: crop.width * 3,
        height: crop.height,
        channels: 4,
        background: '#dededc',
      },
    })
      .composite(panels)
      .png()
      .toBuffer();
    const sheetFile = path.join(out, `${pose}-source-recomposed-diff.png`);
    await sharp(seamSheet)
      .resize({ width: Math.min(crop.width * 3, 2250) })
      .png()
      .toFile(sheetFile);
    report.seamSheet = sheetFile;
    report.seamSheetSourceCrop = crop;
    reports.push(report);
    console.log(
      JSON.stringify({
        pose,
        pass,
        sourcePixels,
        resultPixels,
        lost: lost.count,
        added: added.count,
        alpha: alpha.count,
        opaqueRgbOver1: rgb.count,
        opaqueRgbRounding1: rounding.count,
        maxOpaqueRgbDelta,
      }),
    );
  }
  const payload = {
    checkedAt: new Date().toISOString(),
    root,
    sourceDir,
    reportDir: out,
    rule: 'Native neutral PNG composition: backing, body, headRest, hairLeft, hairRight, bow. Ignore RGB when source alpha=0; require unchanged pixel coverage and exact alpha; opaque RGB tolerance 1.',
    pass: reports.length === poses.length && reports.every((r) => r.pass),
    reports,
  };
  fs.writeFileSync(
    path.join(out, 'report.json'),
    JSON.stringify(payload, null, 2) + '\n',
  );
  console.log(
    `OVERALL ${payload.pass ? 'PASS' : 'FAIL'} — ${path.join(out, 'report.json')}`,
  );
  process.exitCode = payload.pass ? 0 : 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
