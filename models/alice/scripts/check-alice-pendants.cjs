/* oxlint-disable typescript/no-require-imports -- Offline CommonJS animation regression. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {
  createCanvas,
  loadImage,
} = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const { configs } = require('./prepare-alice-pendants.cjs');
require('node:module').registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier.startsWith('./alice-') && !specifier.endsWith('.ts')
        ? `${specifier}.ts`
        : specifier,
      context,
    );
  },
});
async function main() {
  const { createRigState, advanceRig, drawPendants, deformBodyPoint } =
    await import('../alice-rig.ts');
  const { definitionFromManifest } = await import('../alice-rig-assets.ts');
  const output = path.resolve('work/alice/cape-pompoms');
  fs.mkdirSync(output, { recursive: true });
  const state = createRigState();
  let peak = 0,
    different = 0;
  for (let i = 0; i < 1800; i++) {
    const direction = i % 120 < 60 ? -1 : 1;
    advanceRig(state, i / 60, 1 / 60, true, false, 1.8, {
      lean: direction, lift: 0, turn: direction, nod: 0,
    });
    assert(
      Math.abs(state.pomLeft.value) <= 0.065 &&
        Math.abs(state.pomRight.value) <= 0.055,
    );
    assert(
      Number.isFinite(state.pomLeft.velocity) &&
        Number.isFinite(state.pomRight.velocity),
    );
    peak = Math.max(peak, Math.abs(state.pomLeft.value));
    different = Math.max(
      different,
      Math.abs(state.pomLeft.value - state.pomRight.value),
    );
  }
  assert(
    peak > 0.02 && different > 0.008,
    'Two pendants must visibly trail and move independently',
  );
  for (let i = 0; i < 900; i++)
    advanceRig(state, 0, 1 / 60, false, false, 1.15);
  assert(
    Math.abs(state.pomLeft.value) < 1e-6 &&
      Math.abs(state.pomRight.value) < 1e-6,
    'Pendants must settle',
  );
  const poses = [
    'idle',
    'relaxed',
    'side',
    'side-folded',
    'profile',
    'shy',
    'leaning',
  ];
  const sheet = createCanvas(1440, poses.length * 430),
    sc = sheet.getContext('2d');
  sc.fillStyle = '#26313c';
  sc.fillRect(0, 0, sheet.width, sheet.height);
  const report = [];
  for (const [row, pose] of poses.entries()) {
    const root = path.resolve(
      'public/models/alice-cape/layers',
      pose === 'idle' ? '' : pose,
    );
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, 'manifest.json')),
    );
    const definition = definitionFromManifest(manifest);
    const images = Object.fromEntries(
      await Promise.all(
        manifest.layers.map(async (l) => [
          l.id,
          await loadImage(path.join(root, l.runtimeFile)),
        ]),
      ),
    );
    const count = pose === 'leaning' ? 1 : 2;
    assert.equal(definition.rig.pendants.length, count);
    const frame = {
      state: createRigState(),
      time: 0,
      fullBody: false,
      motion: true,
      strength: 1.15,
      blink: 'open',
      mouthOpen: false,
      exploded: false,
      definition,
    };
    const matrices = {};
    const real = createCanvas(1, 1).getContext('2d');
    const proxy = new Proxy(real, {
      get(target, key) {
        if (key === 'drawImage')
          return (image) => {
            const id = definition.rig.pendants.find(
              (p) => images[p.layer] === image,
            )?.layer;
            if (id) matrices[id] = target.getTransform();
          };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    for (const sign of [-1, 1]) {
      frame.state.torso.value = sign * 0.12;
      frame.state.pomLeft.value = sign * 0.065;
      frame.state.pomRight.value = -sign * 0.055;
      drawPendants(proxy, images, frame);
      for (const pendant of definition.rig.pendants) {
        const m = matrices[pendant.layer],
          p = pendant.pivot,
          expected = deformBodyPoint(p.x, p.y, frame);
        const error = Math.hypot(
          m.a * p.x + m.c * p.y + m.e - expected.x,
          m.b * p.x + m.d * p.y + m.f - expected.y,
        );
        assert(
          error < 0.01,
          `${pose}/${pendant.layer}: cord root drifted ${error} native pixels`,
        );
      }
    }
    frame.state = createRigState();
    const [left, top, width, height] = configs[pose].box;
    const pad = 26;
    for (const [col, label] of [
      'Rest',
      'Swing left',
      'Swing right',
      'Cutout layers',
    ].entries()) {
      const canvas = createCanvas(width + pad * 2, height + pad * 2),
        ctx = canvas.getContext('2d');
      ctx.translate(pad - left, pad - top);
      if (col < 3)
        ctx.drawImage(images.body, 0, 0, manifest.width, manifest.height);
      frame.state.pomLeft.value = col === 1 ? -0.065 : col === 2 ? 0.065 : 0;
      frame.state.pomRight.value = col === 1 ? 0.055 : col === 2 ? -0.055 : 0;
      drawPendants(ctx, images, frame);
      const scale = Math.min(340 / canvas.width, 375 / canvas.height);
      sc.drawImage(
        canvas,
        col * 360 + (360 - canvas.width * scale) / 2,
        row * 430 + 45,
        canvas.width * scale,
        canvas.height * scale,
      );
      sc.fillStyle = '#fff';
      sc.font = '18px sans-serif';
      sc.fillText(`${pose} / ${label}`, col * 360 + 14, row * 430 + 28);
    }
    // Reduced motion must draw the exact same matrices even with stale springs.
    frame.motion = false;
    drawPendants(proxy, images, frame);
    for (const p of definition.rig.pendants) {
      const m = matrices[p.layer];
      assert(Math.abs(m.b) < 1e-9 && Math.abs(m.c) < 1e-9);
    }
    report.push({
      pose,
      pendants: count,
      cordRootsPinned: true,
      reducedMotionStable: true,
    });
  }
  fs.writeFileSync(
    path.join(output, 'pendants-motion-review.png'),
    sheet.toBuffer('image/png'),
  );
  fs.writeFileSync(
    path.join(output, 'pendants-report.json'),
    JSON.stringify({ peak, different, poses: report }, null, 2),
  );
  console.log(
    `PASS: ${report.reduce((n, p) => n + p.pendants, 0)} pendant cutouts, independent damping, bounded stress, pinned cord roots and reduced motion.`,
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
