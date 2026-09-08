import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createFrameLoop } from '../models/alice/alice-frame-loop.ts';
import { registerHooks } from 'node:module';

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
const { ALICE_MODELS } = await import('../models/alice/alice-models.ts');
const { getAliceExpressions } =
  await import('../models/alice/alice-expressions.ts');

function fixture(fps, active = true) {
  let nextId = 0;
  const pending = new Map();
  const paints = [];
  const loop = createFrameLoop(
    (now) => paints.push(now),
    {
      request(callback) {
        const id = ++nextId;
        pending.set(id, callback);
        return id;
      },
      cancel(id) {
        pending.delete(id);
      },
    },
    fps,
  );
  const step = (now) => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback(now));
    assert(pending.size <= 1, 'Duplicate animation loops');
  };
  loop.update({ visible: true, active, fps });
  return { loop, pending, paints, step };
}
for (const hz of [60, 120, 144])
  for (const fps of [30, 60]) {
    const f = fixture(fps);
    for (let frame = 0; frame < hz * 10; frame++) f.step((frame * 1000) / hz);
    assert(
      Math.abs(f.paints.length - fps * 10) <= 1,
      `${hz} Hz display: ${f.paints.length} paints for ${fps} FPS`,
    );
    f.loop.update({ visible: false, active: true, fps });
    assert.equal(f.pending.size, 0, 'Hidden tab must stop scheduling frames');
    const count = f.paints.length;
    f.step(15000);
    assert.equal(f.paints.length, count);
    f.loop.update({ visible: true, active: false, fps });
    f.step(16000);
    assert.equal(
      f.paints.length,
      count + 1,
      'Visible still frame must repaint once',
    );
    assert.equal(
      f.pending.size,
      0,
      'Reduced motion must have no recurring frames',
    );
    f.loop.invalidate();
    f.loop.invalidate();
    assert.equal(f.pending.size, 1);
    f.step(17000);
    assert.equal(
      f.pending.size,
      0,
      'Resize/content invalidation must not restart animation',
    );
    f.loop.dispose();
    f.loop.invalidate();
    f.loop.update({ visible: true, active: true, fps });
    assert.equal(f.pending.size, 0, 'Disposed renderers must stay stopped');
  }
console.log(
  'PASS: frame caps at 60/120/144 Hz, hidden/offscreen pause, reduced motion, invalidation and cleanup.',
);

// Verify the deployable output, including repository-subpath URL resolution.
const output = path.resolve('out');
const html = await readFile(path.join(output, 'index.html'), 'utf8');
const entry = html.match(/src="(\.\/assets\/[^" ]+\.js)"/)?.[1];
assert(entry, 'Missing relative entry point');
const entrySource = await readFile(path.join(output, entry), 'utf8');
assert(
  !entrySource.includes('Body shader did not compile'),
  'Character renderer leaked into entry chunk',
);
const files = await readdir(path.join(output, 'assets'));
assert(
  files.some((file) => file.startsWith('alice-companion-')),
  'Missing lazy character chunk',
);
assert(
  files.some((file) => file.startsWith('profile-sections-')),
  'Missing lazy section chunk',
);
let textures = 0;
for (const prefix of ['/', '/personal-profile/'])
  for (const [modelId, model] of Object.entries(ALICE_MODELS))
    for (const pose of model.poses) {
      const base = `${model.assetBase.replace(/^\.\//, '')}/layers${pose === 'idle' ? '' : `/${pose}`}`;
      const manifest = JSON.parse(
        await readFile(path.join(output, base, 'manifest.json'), 'utf8'),
      );
      const runtimeFiles = new Set(
        manifest.layers.map((layer) => layer.runtimeFile),
      );
      for (const layer of manifest.layers) {
        const url = new URL(
          `./${base}/${layer.runtimeFile}`,
          `https://example.test${prefix}`,
        );
        const resolved = path.join(
          output,
          decodeURIComponent(url.pathname.slice(prefix.length)),
        );
        assert((await stat(resolved)).size > 0, `Missing texture: ${resolved}`);
        if (layer.file && !runtimeFiles.has(layer.file)) {
          await assert.rejects(stat(path.join(output, base, layer.file)), {
            code: 'ENOENT',
          });
          assert(
            (await stat(path.join('public', base, layer.file))).size > 0,
            'Authoring source was removed',
          );
        }
        textures++;
      }
      for (const expression of getAliceExpressions(modelId, pose)) {
        const expressions = [
          ...(expression.patch
            ? [
                `${base}/${expression.patch.runtimeFile}`,
                `${base}/${expression.patch.maskFile}`,
              ]
            : []),
          `${model.assetBase}/${expression.sprite}`,
        ];
        if (expression.rigDirectory) {
          const directory = `${model.assetBase}/${expression.rigDirectory}`;
          const special = JSON.parse(
            await readFile(
              path.join(output, directory, 'manifest.json'),
              'utf8',
            ),
          );
          expressions.push(
            ...special.layers.map(
              (layer) => `${directory}/${layer.runtimeFile}`,
            ),
          );
          for (const layer of special.layers)
            await assert.rejects(
              stat(path.join(output, directory, layer.file)),
              { code: 'ENOENT' },
            );
        }
        for (const file of expressions) {
          const url = new URL(
            file.startsWith('./') ? file : `./${file}`,
            `https://example.test${prefix}`,
          );
          assert(
            (
              await stat(
                path.join(
                  output,
                  decodeURIComponent(url.pathname.slice(prefix.length)),
                ),
              )
            ).size > 0,
            `Missing expression: ${file}`,
          );
        }
      }
    }
const css = await readFile(
  path.join(
    output,
    'assets',
    files.find((file) => file.endsWith('.css')),
  ),
  'utf8',
);
assert(
  css.includes('data-open') && css.includes('data-closed'),
  'Sheet state variants must be preserved',
);
assert(
  css.includes('@keyframes enter') && css.includes('@keyframes exit'),
  'Sheet animation primitives must be preserved',
);
console.log(
  `PASS: lazy chunks, ${textures / 2} runtime textures at root/subpath, preserved authoring assets and drawer CSS.`,
);
