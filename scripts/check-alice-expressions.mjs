import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { registerHooks, createRequire } from 'node:module';
import {
  createCanvas,
  Image,
  loadImage,
} from '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';
registerHooks({
  resolve(specifier, context, next) {
    return next(
      /^\.\/alice-[^.]+$/.test(specifier) ? `${specifier}.ts` : specifier,
      context,
    );
  },
});
const { ALICE_MODELS } = await import('../models/alice/alice-models.ts');
const { groups } = createRequire(import.meta.url)(
  '../models/alice/scripts/prepare-alice-expressions.cjs',
);
const { getAliceExpressions, pickAliceExpression, aliceExpressionDelay } =
  await import('../models/alice/alice-expressions.ts');
const { loadRigAsset, loadRigExpression } =
  await import('../models/alice/alice-rig-assets.ts');
const { createRigState } = await import('../models/alice/alice-rig.ts');
const fileFor = (url) =>
  path.resolve(
    'public',
    new URL(url, 'https://example.test/').pathname.slice(1),
  );
let requests = 0;
globalThis.fetch = async (url) => {
  requests++;
  return {
    ok: true,
    json: async () => JSON.parse(readFileSync(fileFor(url), 'utf8')),
  };
};
globalThis.Image = class extends Image {
  set src(url) {
    super.src = readFileSync(fileFor(url));
  }
};
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { createElement: () => createCanvas(1, 1) },
});
const sourceRoot =
  process.env.ALICE_EXPRESSIONS_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘';
const out = path.resolve('work/alice/expressions');
mkdirSync(out, { recursive: true });
const sourcePixels = async (file) => {
  const image = await loadImage(file),
    canvas = createCanvas(image.width, image.height),
    ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    data: ctx.getImageData(0, 0, image.width, image.height).data,
  };
};
let states = 0,
  pixels = 0;
for (const [model, conf] of Object.entries(ALICE_MODELS)) {
  const folder = model === 'penguin' ? '6' : groups[model].folder;
  const covered = new Set(),
    cells = [];
  for (const pose of conf.poses) {
    const choices = getAliceExpressions(model, pose);
    // Prove that even mouth-open/closed-eye frames remain eligible as complete
    // expressions, with no immediate repeats (and stable single-source poses).
    for (const current of choices) {
      const pool = choices.filter((x) => x !== current);
      if (!pool.length)
        assert.equal(pickAliceExpression(model, pose, current.id), current.id);
      else
        for (let i = 0; i < pool.length; i++)
          assert.equal(
            pickAliceExpression(
              model,
              pose,
              current.id,
              () => (i + 0.5) / pool.length,
            ),
            pool[i].id,
          );
    }
    const base = await loadRigAsset(pose, model).catch((error) => {
      throw new Error(`${model}/${pose}: rig load`, { cause: error });
    });
    const source = await sourcePixels(
      path.join(sourceRoot, folder, choices[0].source),
    ).catch((error) => {
      throw new Error(`${model}/${pose}: source load`, { cause: error });
    });
    for (const choice of choices) {
      covered.add(choice.source);
      choice.aliases?.forEach((file) => covered.add(file));
      const asset = choice.rigDirectory
        ? await loadRigAsset(pose, model, choice.id)
        : base;
      const before = requests;
      const expression = await loadRigExpression(asset, choice).catch(
        (error) => {
          throw new Error(`${choice.id}: expression load`, { cause: error });
        },
      );
      assert.equal(
        requests,
        before,
        'Facial changes must not reload body manifests',
      );
      const sprite = await loadImage(
        path.resolve('public', conf.assetBase, choice.sprite),
      );
      assert(sprite.width > 0 && sprite.height === 2400);
      const head = asset.images.headComposite;
      const frame = {
        state: createRigState(),
        time: 0,
        fullBody: false,
        motion: false,
        strength: 1,
        blink: 'open',
        mouthOpen: false,
        exploded: false,
        definition: asset.definition,
        expression,
      };
      head.paint(frame);
      const context = head.image.getContext('2d');
      if (model === 'cape' && choice.rigDirectory) {
        const original = await sourcePixels(
          path.join(sourceRoot, folder, choice.source),
        );
        const layer = asset.definition.layers.headRest;
        const sourceHead = await sourcePixels(
          path.resolve(
            'public',
            conf.assetBase,
            choice.rigDirectory,
            'headRest.webp',
          ),
        );
        const body = await sourcePixels(
          path.resolve(
            'public',
            conf.assetBase,
            choice.rigDirectory,
            'body.png',
          ),
        );
        const neutralHead = base.images.headRest;
        const neutralSurface = createCanvas(
            neutralHead.width,
            neutralHead.height,
          ),
          neutralContext = neutralSurface.getContext('2d');
        neutralContext.drawImage(neutralHead, 0, 0);
        const neutral = neutralContext.getImageData(
          0,
          0,
          neutralHead.width,
          neutralHead.height,
        ).data;
        let chinPixels = 0;
        for (let y = 815; y < 900; y++)
          for (let x = 700; x < 1120; x++) {
            const src = (y * source.width + x) * 4;
            const at = ((y - layer.y) * layer.width + x - layer.x) * 4;
            if (
              neutral[at + 3] !== 255 ||
              source.data[src] <= source.data[src + 2] + 25 ||
              source.data[src + 1] <= source.data[src + 2] + 8 ||
              original.data[src + 3] !== 255
            )
              continue;
            assert.equal(
              sourceHead.data[at + 3],
              255,
              'Dark chin must belong to the moving head',
            );
            assert.equal(
              body.data[src + 3],
              0,
              'Dark chin must not remain on the torso',
            );
            for (let c = 0; c < 4; c++)
              assert.equal(
                sourceHead.data[at + c],
                original.data[src + c],
                'Dark face must retain its own native RGBA',
              );
            chinPixels++;
          }
        assert(chinPixels > 5000, 'Shadow anatomy check must cover the chin');
      }
      if (choice.patch) {
        const expected = await sourcePixels(
          path.join(sourceRoot, folder, choice.source),
        );
        const patch = await sourcePixels(
          path.resolve(
            'public',
            conf.assetBase,
            'layers',
            pose === 'idle' ? '' : pose,
            choice.patch.runtimeFile,
          ),
        );
        const mask = await sourcePixels(
          path.resolve(
            'public',
            conf.assetBase,
            'layers',
            pose === 'idle' ? '' : pose,
            choice.patch.maskFile,
          ),
        );
        const visible = context.getImageData(
          0,
          0,
          head.image.width,
          head.image.height,
        ).data;
        const { left, top, width, height } = choice.patch;
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) {
            const local = (y * width + x) * 4,
              original = ((y + top) * source.width + x + left) * 4;
            const changed =
              (source.data[original + 3] || expected.data[original + 3]) &&
              [0, 1, 2, 3].some(
                (c) =>
                  source.data[original + c] !== expected.data[original + c],
              );
            // PNG premultiplication can round transparent RGB, but opaque source
            // changes must all be represented, including brows and cheek details.
            if (
              changed &&
              source.data[original + 3] === 255 &&
              expected.data[original + 3] === 255
            )
              assert.equal(
                mask.data[local + 3],
                255,
                `${choice.id}: missing native face pixel`,
              );
            if (!mask.data[local + 3]) continue;
            const output =
              ((y + top - head.layer.y) * head.image.width +
                x +
                left -
                head.layer.x) *
              4;
            if (expected.data[original + 3] === 255)
              for (let c = 0; c < 4; c++) {
                assert.equal(
                  patch.data[local + c],
                  expected.data[original + c],
                  `${choice.id}: patch differs from source`,
                );
                assert.equal(
                  visible[output + c],
                  expected.data[original + c],
                  `${choice.id}: runtime leaves an old feature`,
                );
              }
            assert(
              Math.abs(visible[output + 3] - expected.data[original + 3]) <= 1,
              `${choice.id}: old alpha contour remains at ${x + left},${y + top}`,
            );
            pixels++;
          }
        const stable = Buffer.from(visible);
        head.paint({ ...frame, blink: 'closed', mouthOpen: true });
        assert(
          Buffer.from(
            context.getImageData(0, 0, head.image.width, head.image.height)
              .data,
          ).equals(stable),
          'Neutral blink/talk must preserve the complete native expression',
        );
      }
      const cell = createCanvas(240, 310),
        ctx = cell.getContext('2d');
      ctx.fillStyle = '#dfe4ed';
      ctx.fillRect(0, 0, 240, 310);
      const scale = Math.min(240 / head.image.width, 280 / head.image.height);
      ctx.drawImage(
        head.image,
        (240 - head.image.width * scale) / 2,
        0,
        head.image.width * scale,
        head.image.height * scale,
      );
      ctx.fillStyle = '#20242c';
      ctx.font = '14px sans-serif';
      ctx.fillText(`${pose} / ${choice.id}`, 7, 300);
      cells.push(cell);
      states++;
    }
  }
  const files = readdirSync(path.join(sourceRoot, folder)).filter((file) =>
    /\.png$/i.test(file),
  );
  assert.deepEqual(
    [...covered].sort((a, b) => a.localeCompare(b)),
    files.sort((a, b) => a.localeCompare(b)),
    `${model}: every original or duplicate alias must be covered`,
  );
  const sheet = createCanvas(240 * 6, 310 * Math.ceil(cells.length / 6)),
    ctx = sheet.getContext('2d');
  cells.forEach((cell, i) =>
    ctx.drawImage(cell, (i % 6) * 240, Math.floor(i / 6) * 310),
  );
  writeFileSync(path.join(out, `${model}.png`), sheet.toBuffer('image/png'));
  console.log(
    `PASS: ${model}: ${cells.length} states, ${covered.size} source files, native pixels and independent expression loading.`,
  );
}
assert.equal(
  states,
  Object.entries(ALICE_MODELS).reduce(
    (count, [model, config]) =>
      count +
      config.poses.reduce(
        (total, pose) => total + getAliceExpressions(model, pose).length,
        0,
      ),
    0,
  ),
);
assert.equal(
  aliceExpressionDelay(() => 0),
  4000,
);
assert.equal(
  aliceExpressionDelay(() => 1),
  8000,
);
console.log(
  `PASS: ${states} complete states, ${pixels} replaced pixels, source coverage, alpha contours, no-repeat draws and 4–8s holds.`,
);
