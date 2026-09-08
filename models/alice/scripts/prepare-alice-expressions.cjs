/** Import complete native expressions, after the outfit preparation scripts.
 * Original files are read-only. Facial masks replace RGBA, including silhouette
 * changes; the red-eye source gets a complete rig because its whole body changes.
 */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const SOURCE =
  process.env.ALICE_EXPRESSIONS_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘';
const groups = {
  winter: {
    folder: '2',
    base: 'alice',
    prefix: 'ARI_A_08_',
    poses: {
      idle: '02',
      thinking: '03',
      relaxed: '08',
      front: '09',
      side: '14',
      'side-folded': '16',
      profile: '17',
      shy: '19',
      leaning: '20',
    },
  },
  cape: {
    folder: '4',
    base: 'alice-cape',
    prefix: 'ARI_A_13_',
    poses: {
      idle: '02',
      relaxed: '08',
      side: '14',
      'side-folded': '16',
      profile: '17',
      shy: '19',
      leaning: '20',
    },
  },
  dress: {
    folder: '3',
    base: 'alice-dress',
    prefix: 'ARI_A_12_',
    poses: {
      idle: '02',
      thinking: '03',
      relaxed: '08',
      'hand-over-mouth': '10',
      side: '14',
      'side-folded': '16',
      shy: '19',
      tea: 'tea',
    },
  },
  sweater: {
    folder: '1',
    base: 'alice-sweater',
    prefix: 'ARI_A_01_',
    poses: {
      idle: '02',
      thinking: '03',
      relaxed: '08',
      'hand-over-mouth': '10',
      side: '14',
      'side-folded': '16',
      shy: '19',
    },
  },
};
groups.cloak = {
  folder: '5',
  base: 'alice-cloak',
  prefix: 'ARI_A_14_',
  poses: {
    idle: '02',
    thinking: '03',
    relaxed: '08',
    front: '09',
    'hand-over-mouth': '10',
    side: '14',
    'side-folded': '16',
    profile: '17',
    shy: '19',
    leaning: '20',
  },
};
const raw = (input) =>
  sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const idFor = (file) => file.replace(/-HD\.png$/, '').replace(/^ARI_A_/, '');
async function reserveFacePixels(rigPath, manifest, original, union) {
  // Some old cutouts accidentally classified eyelashes as hair or bow. Reserve
  // the union of every native expression's changed pixels for the rigid face,
  // so an outgoing expression can never leave moving feature ghosts behind.
  const headIds = ['head', 'headRest', 'headTalk'];
  const featureBoxes = manifest.layers.filter((l) =>
    ['eyesOpen', 'mouthClosed'].includes(l.id),
  );
  for (const layer of manifest.layers.filter((l) =>
    [...headIds, 'hairLeft', 'hairRight', 'bow', 'body', 'backing'].includes(
      l.id,
    ),
  )) {
    const image = await sharp(path.join(rigPath, layer.file))
      .resize(layer.width, layer.height, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();
    for (let y = 0; y < layer.height; y++)
      for (let x = 0; x < layer.width; x++) {
        const sx = x + layer.left,
          sy = y + layer.top,
          src = sy * original.info.width + sx;
        if (!union[src]) continue;
        const dst = (y * layer.width + x) * 4;
        if (!headIds.includes(layer.id)) {
          image[dst + 3] = 0;
          continue;
        }
        const inside = (box) =>
          sx >= box.left &&
          sx < box.left + box.width &&
          sy >= box.top &&
          sy < box.top + box.height;
        if (layer.id === 'head' && featureBoxes.some(inside)) continue;
        if (
          layer.id === 'headTalk' &&
          featureBoxes
            .filter((l) => l.id === 'mouthClosed')
            .some((box) =>
              inside({
                ...box,
                left: box.left + 4,
                top: box.top + 4,
                width: box.width - 8,
                height: box.height - 8,
              }),
            )
        )
          continue;
        for (let c = 0; c < 4; c++) image[dst + c] = original.data[src * 4 + c];
      }
    const input = sharp(image, {
      raw: { width: layer.width, height: layer.height, channels: 4 },
    });
    await input.clone().png().toFile(path.join(rigPath, layer.file));
    const runtime =
      layer.id === 'body'
        ? input.resize({ height: 3600, withoutEnlargement: true })
        : input;
    await runtime
      .webp(
        layer.id === 'body'
          ? { quality: 95, alphaQuality: 100, effort: 4 }
          : { lossless: true, effort: 4 },
      )
      .toFile(path.join(rigPath, layer.runtimeFile));
  }
}
async function main() {
  const modelIndex = process.argv.indexOf('--model');
  const selectedModel = modelIndex < 0 ? null : process.argv[modelIndex + 1];
  if (modelIndex >= 0) assert(groups[selectedModel], 'Unknown model');
  const catalog = {};
  const shadowOnly = process.argv.includes('--shadow-only');
  for (const [model, conf] of Object.entries(shadowOnly ? {} : groups)) {
    if (selectedModel && model !== selectedModel) continue;
    const directory = path.join(SOURCE, conf.folder),
      root = path.resolve('public/models', conf.base);
    catalog[model] = {};
    for (const [pose, group] of Object.entries(conf.poses)) {
      const rigPath = path.join(root, 'layers', pose === 'idle' ? '' : pose);
      const manifestPath = path.join(rigPath, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath));
      const base = await raw(path.join(directory, manifest.source));
      const files = fs
        .readdirSync(directory)
        .filter((f) =>
          group === 'tea'
            ? f === 'ARI_A_17_05_00-HD.png'
            : f.startsWith(conf.prefix + group + '_') && f.endsWith('-HD.png'),
        )
        .sort();
      assert(
        files.includes(manifest.source),
        `${model}/${pose}: missing original`,
      );
      const head = manifest.layers.find((l) => l.id === 'head');
      const expressions = [];
      const union = new Uint8Array(base.info.width * base.info.height);
      for (const file of files) {
        const id = idFor(file),
          entry = { id, source: file, sprite: `${pose}.webp` };
        if (file !== manifest.source) {
          const variant = await raw(path.join(directory, file));
          assert.deepEqual(
            variant.info,
            base.info,
            `${file}: mismatched source dimensions`,
          );
          let x0 = base.info.width,
            y0 = base.info.height,
            x1 = -1,
            y1 = -1;
          for (let i = 0; i < base.data.length; i += 4) {
            if (!base.data[i + 3] && !variant.data[i + 3]) continue;
            if (
              [0, 1, 2, 3].every(
                (c) => base.data[i + c] === variant.data[i + c],
              )
            )
              continue;
            union[i / 4] = 1;
            const x = (i / 4) % base.info.width,
              y = Math.floor(i / 4 / base.info.width);
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
          assert(
            x1 >= x0,
            `${file}: duplicate expression must be recorded as an alias`,
          );
          const box = {
            left: Math.max(head.left, x0 - 4),
            top: Math.max(head.top, y0 - 4),
            width: 0,
            height: 0,
          };
          box.width = Math.min(head.left + head.width, x1 + 5) - box.left;
          box.height = Math.min(head.top + head.height, y1 + 5) - box.top;
          assert(
            x0 >= head.left &&
              y0 >= head.top &&
              x1 < head.left + head.width &&
              y1 < head.top + head.height,
            `${file}: changes outside head need a full rig`,
          );
          const runtimeFile = `expressions/${id}.webp`;
          const maskFile = `expressions/${id}-mask.webp`;
          fs.mkdirSync(path.join(rigPath, 'expressions'), { recursive: true });
          const pixels = Buffer.alloc(box.width * box.height * 4),
            mask = Buffer.alloc(pixels.length);
          for (let y = 0; y < box.height; y++)
            for (let x = 0; x < box.width; x++) {
              const src = ((y + box.top) * base.info.width + x + box.left) * 4,
                dst = (y * box.width + x) * 4;
              if (!base.data[src + 3] && !variant.data[src + 3]) continue;
              if (
                [0, 1, 2, 3].every(
                  (c) => base.data[src + c] === variant.data[src + c],
                )
              )
                continue;
              for (let c = 0; c < 4; c++) {
                pixels[dst + c] = variant.data[src + c];
                mask[dst + c] = 255;
              }
            }
          for (const [data, file] of [
            [pixels, runtimeFile],
            [mask, maskFile],
          ])
            await sharp(data, {
              raw: { width: box.width, height: box.height, channels: 4 },
            })
              .webp({ lossless: true, effort: 4 })
              .toFile(path.join(rigPath, file));
          entry.patch = { ...box, runtimeFile, maskFile };
          entry.sprite = `expressions/${id}.webp`;
          fs.mkdirSync(path.join(root, 'expressions'), { recursive: true });
          await sharp(path.join(directory, file))
            .resize({ height: 2400 })
            .webp({ quality: 92, alphaQuality: 100, effort: 4 })
            .toFile(path.join(root, entry.sprite));
        }
        expressions.push(entry);
      }
      // First entry is always the established default, independent of filename ordering.
      expressions.sort(
        (a, b) =>
          Number(b.source === manifest.source) -
          Number(a.source === manifest.source),
      );
      if (model === 'cape' && pose === 'relaxed')
        expressions.push({
          id: '13_11_00',
          source: 'ARI_A_13_11_00-HD.png',
          sprite: 'relaxed-shadow.webp',
          rigDirectory: 'layers/relaxed-shadow',
        });
      if (model === 'cape' && pose === 'profile')
        expressions.find((e) => e.id === '13_17_00').aliases = [
          'ari_a_13_17_00_01_01-HD.png',
        ];
      if (model === 'cape' && pose === 'shy')
        expressions.find((e) => e.id === '13_19_01').aliases = [
          'ari_a_13_19_00_01_01-HD.png',
        ];
      if (model === 'sweater' && pose === 'hand-over-mouth')
        expressions.push({
          id: '01_10_00_01_00',
          source: 'ari_a_01_10_00_01_00-HD.png',
          sprite: 'hand-over-mouth-soft.webp',
          rigDirectory: 'layers/hand-over-mouth-soft',
        });
      if (model === 'cloak') {
        // These padded/resampled exports show the same expressions. Keep their
        // provenance without double-weighting the matching sharper originals.
        const aliases = {
          '14_09_00': 'ari_a_14_09_00_01_01-HD.png',
          '14_20_00': 'ari_a_14_20_00_01_01-HD.png',
          '14_20_04': 'ari_a_14_20_04_01_01-HD.png',
        };
        for (const expression of expressions)
          if (aliases[expression.id])
            expression.aliases = [aliases[expression.id]];
      }
      manifest.expressions = expressions;
      if (expressions.some((e) => e.patch))
        await reserveFacePixels(rigPath, manifest, base, union);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      catalog[model][pose] = expressions;
      console.log(
        `${model}/${pose}: ${expressions.length} complete expressions`,
      );
    }
  }
  // Reuse the original segmentation and pendant extraction for the dark source.
  if (!selectedModel || selectedModel === 'cape') {
    process.env.ALICE_SOURCE_DIR = path.join(SOURCE, '4');
    const pendants = require('./prepare-alice-pendants.cjs');
    pendants.configs['relaxed-shadow'] = pendants.configs.relaxed;
    const cape = require('./prepare-alice-cape.cjs');
    await cape.prepare('relaxed-shadow', {
      ...cape.configs.relaxed,
      source: '11_00',
      maskSource: '08_00',
      half: undefined,
      closed: undefined,
      talk: undefined,
    });
  }
  if (!shadowOnly)
    fs.writeFileSync(
      'models/alice/native-expressions.json',
      JSON.stringify(
        {
          ...JSON.parse(
            fs.readFileSync('models/alice/native-expressions.json'),
          ),
          ...catalog,
        },
        null,
        2,
      ) + '\n',
    );
}
module.exports = { groups };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
