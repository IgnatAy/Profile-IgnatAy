/* oxlint-disable typescript/no-require-imports -- Offline source-pixel regression. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const {
  configs,
  preparePendants,
  REVISION,
} = require('./prepare-alice-pendants.cjs');
const sourceRoot =
  process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/4';
const releasedCloth = {
  idle: {
    pomLeft: [
      [810, 1264],
      [822, 1272],
      [826, 1276],
      [830, 1280],
    ],
    pomRight: [[906, 1280]],
  },
  shy: {
    pomLeft: [
      [564, 1223],
      [576, 1231],
      [580, 1239],
    ],
    pomRight: [
      [616, 1215],
      [636, 1219],
      [644, 1223],
    ],
  },
  leaning: {
    pomLeft: [
      [416, 1273],
      [416, 1281],
      [420, 1285],
    ],
  },
};

(async () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alice-pendant-mattes-'),
  );
  let probes = 0;
  try {
    for (const [pose, config] of Object.entries(configs)) {
      const root = path.resolve(
        'public/models/alice-cape/layers',
        pose === 'idle' ? '' : pose,
      );
      const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
      assert.equal(m.pendantRevision, REVISION);
      const [left, top, width, height] = config.box;
      const source = path.join(sourceRoot, m.source);
      const crop = async (file) =>
        sharp(file)
          .extract({ left, top, width, height })
          .ensureAlpha()
          .raw()
          .toBuffer();
      const original = await crop(source),
        body = await crop(path.join(root, 'body.png'));
      for (const [id, points] of Object.entries(releasedCloth[pose] ?? {})) {
        const layer = await sharp(path.join(root, id + '.png'))
          .ensureAlpha()
          .raw()
          .toBuffer();
        for (const [x, y] of points) {
          const j = ((y - top) * width + x - left) * 4;
          assert(
            layer[j + 3] <= 20,
            `${pose}/${id}: coat pixel ${x},${y} must not move as opaque fur`,
          );
          probes++;
        }
      }
      if (pose === 'idle') {
        for (const [x, y, id] of [
          [835, 1150, 'pomLeft'],
          [875, 1150, 'pomRight'],
          [815, 1260, 'pomLeft'],
          [880, 1260, 'pomRight'],
        ]) {
          const j = ((y - top) * width + x - left) * 4;
          const layer = await sharp(path.join(root, id + '.png'))
            .ensureAlpha()
            .raw()
            .toBuffer();
          assert(
            body[j] >= 50 && body[j] - original[j] >= 15,
            `Detached cord shadow remains at ${x},${y}`,
          );
          assert(
            layer[j + 3] > 60 && layer[j + 3] < 230,
            'Cord shadow must remain translucent and follow its own cord',
          );
          probes++;
        }
      }
      if (pose === 'shy') {
        // This vertical garment seam was inside the previous broad shadow mask.
        for (let y = 1100; y <= 1335; y++) {
          const j = ((y - top) * width + 492 - left) * 4;
          assert.deepEqual(
            body.subarray(j, j + 4),
            original.subarray(j, j + 4),
            `Stationary coat seam changed at y=${y}`,
          );
          probes++;
        }
      }
      // Re-extraction must not accumulate body repairs or depend on old mattes.
      const scratch = path.join(temporary, pose);
      fs.mkdirSync(scratch);
      for (const file of ['body.png', 'manifest.json'])
        fs.copyFileSync(path.join(root, file), path.join(scratch, file));
      await preparePendants(pose, scratch, source);
      const files = [
        'body.png',
        'body.webp',
        'manifest.json',
        ...m.rig.pendants.flatMap((p) => [p.layer + '.png', p.layer + '.webp']),
      ];
      for (const file of files)
        assert.deepEqual(
          fs.readFileSync(path.join(scratch, file)),
          fs.readFileSync(path.join(root, file)),
          `${pose}/${file}: extraction is not repeatable`,
        );
    }
    console.log(
      `PASS: ${probes} coat/shadow pixel probes; all seven pendant extractions are byte-identical on rerun.`,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
