/** Penguin source reconstruction and single-pose asset contract. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS regression check. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
require('node:module').registerHooks({
  resolve(specifier, context, next) {
    return next(
      /^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier,
      context,
    );
  },
});
async function main() {
  const { ALICE_MODELS } = require('../alice-models.ts');
  const {
    getAliceExpressions,
    pickAliceExpression,
  } = require('../alice-expressions.ts');
  assert.deepEqual(ALICE_MODELS.penguin.poses, ['idle']);
  const choices = getAliceExpressions('penguin', 'idle');
  assert.equal(choices.length, 1);
  for (let i = 0; i < 100; i++)
    assert.equal(
      pickAliceExpression('penguin', 'idle', choices[0].id),
      choices[0].id,
    );
  const root = path.resolve('public/models/alice-penguin');
  const m = JSON.parse(
    fs.readFileSync(path.join(root, 'layers/manifest.json')),
  );
  assert(m.rig.blink && !m.rig.mouth);
  assert.equal(m.rig.headGain, 0);
  assert.equal(m.rig.nodGain, 0);
  const load = (input) =>
    sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const original = await load(
    path.join(
      process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/6',
      m.source,
    ),
  );
  const layers = [
    'backing',
    'body',
    'headRest',
    'hairLeft',
    'hairRight',
    'bow',
  ].map((id) => {
    const l = m.layers.find((item) => item.id === id);
    return {
      input: path.join(root, 'layers', l.file),
      left: l.left,
      top: l.top,
    };
  });
  const composed = await sharp({
    create: {
      width: m.width,
      height: m.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const result = await load(composed);
  let alphaError = 0,
    rgbError = 0;
  for (let i = 0; i < original.data.length; i += 4) {
    alphaError = Math.max(
      alphaError,
      Math.abs(original.data[i + 3] - result.data[i + 3]),
    );
    if (original.data[i + 3] === 255)
      for (let c = 0; c < 3; c++)
        rgbError = Math.max(
          rgbError,
          Math.abs(original.data[i + c] - result.data[i + c]),
        );
  }
  assert.equal(alphaError, 0, 'Neutral layers must preserve source coverage');
  assert(rgbError <= 1, 'Neutral layers must preserve original opaque colors');
  for (const name of ['idle', 'half-eye', 'talk']) {
    const meta = await sharp(path.join(root, `${name}.webp`)).metadata();
    assert(Math.abs(meta.width / meta.height - m.width / m.height) < 0.001);
  }
  assert.deepEqual(
    fs.readFileSync(path.join(root, 'talk.webp')),
    fs.readFileSync(path.join(root, 'idle.webp')),
    'No invented mouth movement in fallback',
  );
  const report = {
    source: m.source,
    alphaError,
    rgbError,
    singlePose: true,
    blink: true,
    mouth: false,
    runtimeTextures: m.layers.length,
  };
  fs.writeFileSync(
    'work/alice/penguin/recomposition-report.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(
    'PASS: penguin neutral source reconstruction, stable single expression, locked hood/face and sprite fallbacks.',
    report,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
