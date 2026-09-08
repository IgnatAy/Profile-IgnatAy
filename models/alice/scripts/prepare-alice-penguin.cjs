/** Folder 6: single-pose penguin costume, with eye motion borrowed from cape.
 * Source PNGs stay read-only. Transfer only the donor expression's changed region;
 * the penguin's neutral face, fringe, costume and alpha remain its own pixels. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const { createNativeOutfitPreparer } = require('./prepare-native-outfit.cjs');
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/6';
const DONOR =
  process.env.ALICE_PENGUIN_DONOR_DIR || '/Users/1gnat4y/Desktop/立绘/4';
const OUT = path.resolve('public/models/alice-penguin');
const WORK = path.resolve('work/alice/penguin');
const ORIGINAL = 'ARI_A_17_12_00-HD.png';
const revision = 'penguin-native-20260908-1';
const rect = (left, top, width, height) => ({ left, top, width, height });
const eyeBox = rect(1433, 918, 427, 150);
// Native face registration: cape coordinates + (754, 356) = penguin.
const donorBox = { ...eyeBox, left: eyeBox.left - 754, top: eyeBox.top - 356 };
const config = {
  source: ORIGINAL,
  half: 'penguin-half.png',
  closed: 'penguin-closed.png',
  headBox: rect(1220, 0, 800, 1450),
  headShape: 'M1300 650 H1950 V1370 H1300 Z',
  eyeBox,
  mouthBox: rect(1600, 1110, 112, 74),
  skin: rect(1490, 1150, 280, 70),
  hairLeft: '',
  hairRight: '',
  backingBox: rect(1260, 650, 740, 750),
  rig: {
    headPivot: { x: 1670, y: 1320 },
    bodyPivot: { x: 1670, y: 3500 },
    bodyRigidUntil: 1800,
    bodyFixedFrom: 5250,
    hairLeft: { pin: 1320, tip: 1390 },
    hairRight: { pin: 1320, tip: 1390 },
    // Keep face and hood on the same transform; no unsupported neck turning.
    headGain: 0,
    nodGain: 0,
    arms: [],
  },
};
const expression = { id: '17_12_00', source: ORIGINAL, sprite: 'idle.webp' };
async function main() {
  const stage = path.join(WORK, 'sources');
  fs.mkdirSync(stage, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.copyFileSync(path.join(SOURCE, ORIGINAL), path.join(stage, ORIGINAL));
  const crop = (input, box) =>
    sharp(input).extract(box).ensureAlpha().raw().toBuffer();
  const neutral = await crop(path.join(SOURCE, ORIGINAL), eyeBox);
  const donorOpen = await crop(
    path.join(DONOR, 'ARI_A_13_08_00-HD.png'),
    donorBox,
  );
  for (const [name, donor] of [
    ['half', '02'],
    ['closed', '03'],
  ]) {
    const variant = await crop(
      path.join(DONOR, `ARI_A_13_08_${donor}-HD.png`),
      donorBox,
    );
    const mask = Buffer.alloc(eyeBox.width * eyeBox.height);
    for (let y = 0; y < eyeBox.height; y++)
      for (let x = 0; x < eyeBox.width; x++) {
        const i = (y * eyeBox.width + x) * 4;
        if (
          Math.max(
            ...[0, 1, 2].map((c) =>
              Math.abs(variant[i + c] - donorOpen[i + c]),
            ),
          ) < 5
        )
          continue;
        // Include the subpixel registration fringe, preventing old eyelash ghosts.
        for (let dy = -5; dy <= 5; dy++)
          for (let dx = -5; dx <= 5; dx++)
            if (
              x + dx >= 0 &&
              x + dx < eyeBox.width &&
              y + dy >= 0 &&
              y + dy < eyeBox.height
            )
              mask[(y + dy) * eyeBox.width + x + dx] = 255;
      }
    const feather = await sharp(mask, {
      raw: { width: eyeBox.width, height: eyeBox.height, channels: 1 },
    })
      .blur(1.5)
      .extractChannel(0)
      .raw()
      .toBuffer();
    const patch = Buffer.from(neutral);
    let changed = 0;
    for (let y = 0; y < eyeBox.height; y++)
      for (let x = 0; x < eyeBox.width; x++) {
        const i = (y * eyeBox.width + x) * 4;
        const edge = Math.max(
          0,
          Math.min(
            1,
            (Math.min(x, y, eyeBox.width - 1 - x, eyeBox.height - 1 - y) - 3) /
              10,
          ),
        );
        const weight =
          (edge * edge * (3 - 2 * edge) * feather[y * eyeBox.width + x]) / 255;
        for (let c = 0; c < 3; c++) {
          patch[i + c] = Math.round(
            neutral[i + c] * (1 - weight) + variant[i + c] * weight,
          );
          if (Math.abs(patch[i + c] - neutral[i + c]) > 5) changed++;
        }
      }
    assert(changed > 100, `${name}: donor must visibly animate the eyes`);
    const png = await sharp(patch, {
      raw: { width: eyeBox.width, height: eyeBox.height, channels: 4 },
    })
      .png()
      .toBuffer();
    await sharp(path.join(SOURCE, ORIGINAL))
      .composite([{ input: png, left: eyeBox.left, top: eyeBox.top }])
      .png()
      .toFile(path.join(stage, `penguin-${name}.png`));
  }
  await createNativeOutfitPreparer({
    sourceDirectory: stage,
    outputDirectory: OUT,
    reviewDirectory: WORK,
    revision,
    file: (id) => id,
  })('idle', config);
  // The existing sprite fallback expects these idle filenames even without mouth motion.
  await sharp(path.join(stage, 'penguin-closed.png'))
    .resize({ height: 2400 })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(path.join(OUT, 'half-eye.webp'));
  fs.copyFileSync(path.join(OUT, 'idle.webp'), path.join(OUT, 'talk.webp'));
  const manifestPath = path.join(OUT, 'layers/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.expressions = [expression];
  manifest.borrowedEyes = {
    model: 'cape',
    pose: 'relaxed',
    open: 'ARI_A_13_08_00-HD.png',
    half: 'ARI_A_13_08_02-HD.png',
    closed: 'ARI_A_13_08_03-HD.png',
    offset: [754, 356],
    method:
      'native donor expression difference mask, expanded 5px and feathered; preserve penguin alpha',
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const catalogPath = path.resolve('models/alice/native-expressions.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath));
  catalog.penguin = { idle: [expression] };
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
}
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { config };
