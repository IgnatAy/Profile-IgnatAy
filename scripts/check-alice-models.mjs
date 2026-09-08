import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import path from 'node:path';
// Pass `out` to exercise the actual Pages manifests and shared texture URLs.
const assetRoot = path.resolve(process.argv[2] ?? 'public');
import {
  createCanvas,
  loadImage,
  Image as NativeImage,
} from '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas/index.js';

registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier.startsWith('./alice-') && !specifier.endsWith('.ts')
        ? `${specifier}.ts`
        : specifier,
      context,
    );
  },
});
const models = await import('../models/alice/alice-models.ts');
const { ALICE_MODELS, ALICE_MODEL_IDS, pickAliceModel } = models;
assert.equal(new Set(ALICE_MODEL_IDS).size, ALICE_MODEL_IDS.length);
for (const required of ['winter', 'cape', 'dress'])
  assert(
    ALICE_MODEL_IDS.includes(required),
    `Existing outfit missing: ${required}`,
  );
for (const [index, model] of ALICE_MODEL_IDS.entries())
  for (const offset of [0, 0.5, 1 - 1e-9])
    assert.equal(
      pickAliceModel(() => (index + offset) / ALICE_MODEL_IDS.length),
      model,
      'Each outfit must have an equally sized selection interval',
    );
assert.equal(
  models.getDocumentAliceModel(),
  'winter',
  'SSR uses a deterministic default',
);

const nativeRandom = Math.random;
globalThis.window = {};
try {
  Math.random = () => 1.5 / ALICE_MODEL_IDS.length;
  assert.equal(
    models.getDocumentAliceModel(),
    'cape',
    'SSR must not select the client outfit',
  );
  Math.random = () => 0.5 / ALICE_MODEL_IDS.length;
  for (let i = 0; i < 20; i++)
    assert.equal(
      models.getDocumentAliceModel(),
      'cape',
      'Rerenders/remounts must retain this document outfit',
    );
  const nextDocument =
    await import('../models/alice/alice-models.ts?new-document');
  assert.equal(
    nextDocument.getDocumentAliceModel(),
    'winter',
    'A new document must draw again',
  );
  for (const [index, model] of ALICE_MODEL_IDS.entries()) {
    Math.random = () => (index + 0.5) / ALICE_MODEL_IDS.length;
    const freshDocument = await import(
      `../models/alice/alice-models.ts?document-${model}`
    );
    assert.equal(freshDocument.getDocumentAliceModel(), model);
    Math.random = () =>
      ((index + 1.5) % ALICE_MODEL_IDS.length) / ALICE_MODEL_IDS.length;
    assert.equal(freshDocument.getDocumentAliceModel(), model);
  }
} finally {
  Math.random = nativeRandom;
  delete globalThis.window;
}
console.log(
  'PASS: equal model probability, SSR isolation, stable document selection and fresh reload selection.',
);

const requests = [];
let failNext = false;
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (url) => {
  requests.push(url);
  if (failNext) {
    failNext = false;
    return { ok: false };
  }
  const file = path.resolve(
    assetRoot,
    new URL(url, 'https://example.test/').pathname.slice(1),
  );
  return {
    ok: true,
    json: async () => JSON.parse(await readFile(file, 'utf8')),
  };
};
globalThis.Image = class extends NativeImage {
  set src(url) {
    super.src = readFileSync(
      path.resolve(
        assetRoot,
        new URL(url, 'https://example.test/').pathname.slice(1),
      ),
    );
  }
};
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: {
    createElement: (tag) => {
      assert.equal(tag, 'canvas');
      return createCanvas(1, 1);
    },
  },
});
try {
  const { loadRigAsset } = await import('../models/alice/alice-rig-assets.ts');
  const { createRigState } = await import('../models/alice/alice-rig.ts');
  const winterPending = loadRigAsset('idle', 'winter');
  assert.equal(
    loadRigAsset('idle', 'winter'),
    winterPending,
    'Concurrent loads should share a promise',
  );
  const winter = await winterPending;
  const cape = await loadRigAsset('idle', 'cape');
  assert.equal(winter.model, 'winter');
  assert.equal(cape.model, 'cape');
  assert.notEqual(
    cape,
    winter,
    'Same pose in different outfits must not share layers',
  );
  assert.equal(requests.length, 2);
  assert.equal(await loadRigAsset('idle', 'winter'), winter);
  await loadRigAsset('relaxed', 'cape');
  assert.equal(
    await loadRigAsset('idle', 'winter'),
    winter,
    'Most recently used pose stays cached',
  );
  await loadRigAsset('idle', 'cape');
  assert.equal(requests.length, 4, 'Only two poses should remain cached');
  await assert.rejects(loadRigAsset('thinking', 'cape'), /Unsupported/);
  assert.equal(
    requests.length,
    4,
    'Unavailable poses must not request missing files',
  );
  failNext = true;
  await assert.rejects(loadRigAsset('shy', 'cape'), /Cannot load/);
  assert.equal(
    (await loadRigAsset('shy', 'cape')).pose,
    'shy',
    'Failed loads can retry',
  );
  const dress = await loadRigAsset('idle', 'dress');
  assert.equal(dress.model, 'dress');
  assert.notEqual(dress, winter);
  assert.notEqual(dress, cape);
  const cloak = await loadRigAsset('idle', 'cloak');
  assert.equal(cloak.model, 'cloak');
  for (const other of [winter, cape, dress]) assert.notEqual(cloak, other);
  await assert.rejects(loadRigAsset('tea', 'cloak'), /Unsupported/);
  const sweater = await loadRigAsset('idle', 'sweater');
  assert.equal(sweater.model, 'sweater');
  for (const other of [winter, cape, dress, cloak])
    assert.notEqual(sweater, other);
  await assert.rejects(loadRigAsset('tea', 'sweater'), /Unsupported/);
  await assert.rejects(loadRigAsset('tea', 'winter'), /Unsupported/);
  await assert.rejects(loadRigAsset('hand-over-mouth', 'cape'), /Unsupported/);
  let exactHeads = 0;
  for (const [model, config] of Object.entries(ALICE_MODELS)) {
    // Exercise the compatibility sprites used when layered rendering fails.
    const fallbackFrames = ['half-eye', 'talk'];
    if (config.poses.includes('front')) fallbackFrames.push('front-talk');
    for (const frame of fallbackFrames) {
      const sprite = await loadImage(
        path.resolve(assetRoot, config.assetBase, `${frame}.webp`),
      );
      assert(
        sprite.width > 0 && sprite.height > 0,
        `${model}/${frame}: invalid fallback`,
      );
    }
    for (const pose of config.poses) {
      const asset = await loadRigAsset(pose, model);
      assert.equal(asset.model, model);
      assert.equal(asset.pose, pose);
      // Exercise the production lazy expression compositor after actual texture decode.
      for (const eyes of ['open', 'half', 'closed'])
        for (const mouth of ['rest', 'talk'])
          assert(asset.images.faceFrames[`${eyes}-${mouth}`].width > 0);
      // The actual head compositor must preserve cutout edges at rest. A wide
      // resampling filter used to introduce seams before the final screen scale.
      const head = asset.images.headComposite;
      head.paint({
        state: createRigState(),
        time: 0,
        fullBody: false,
        motion: false,
        strength: 1.15,
        blink: 'open',
        mouthOpen: false,
        exploded: false,
        definition: asset.definition,
      });
      const expected = createCanvas(head.image.width, head.image.height);
      const ctx = expected.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const rx = expected.width / head.layer.width;
      const ry = expected.height / head.layer.height;
      const headLayers = ['headRest', 'hairLeft', 'hairRight', 'bow'];
      // Early winter assets were downscaled with differing rounding (e.g.
      // head 638x810, hair 638x811). Their required resampling is covered by
      // the rig/hair checks, not this exact native-grid cutout comparison.
      if (
        rx !== 1 ||
        ry !== 1 ||
        headLayers.some((id) => {
          const rect = asset.definition.layers[id];
          return (
            asset.images[id].width !== rect.width ||
            asset.images[id].height !== rect.height
          );
        })
      )
        continue;
      for (const id of headLayers) {
        const rect = asset.definition.layers[id];
        ctx.drawImage(
          asset.images[id],
          (rect.x - head.layer.x) * rx,
          (rect.y - head.layer.y) * ry,
          rect.width * rx,
          rect.height * ry,
        );
      }
      const reference = ctx.getImageData(
        0,
        0,
        expected.width,
        expected.height,
      ).data;
      const actual = head.image
        .getContext('2d')
        .getImageData(0, 0, expected.width, expected.height).data;
      let alphaError = 0,
        opaqueError = 0;
      for (let i = 0; i < actual.length; i += 4) {
        alphaError = Math.max(
          alphaError,
          Math.abs(actual[i + 3] - reference[i + 3]),
        );
        if (actual[i + 3] === 255 && reference[i + 3] === 255)
          for (let c = 0; c < 3; c++)
            opaqueError = Math.max(
              opaqueError,
              Math.abs(actual[i + c] - reference[i + c]),
            );
      }
      assert(
        alphaError <= 1 && opaqueError <= 1,
        `${model}/${pose}: head cutout seams (alpha ${alphaError}, RGB ${opaqueError})`,
      );
      exactHeads++;
    }
  }
  console.log(
    `PASS: all outfits decode, model-isolated LRU cache, failed-load retry, supported poses, expressions and ${exactHeads} exact native-grid resting heads.`,
  );
} finally {
  globalThis.fetch = nativeFetch;
  delete globalThis.Image;
  delete globalThis.document;
}
