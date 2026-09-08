import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('public');
const output = path.resolve('out');
const authoring = new Set();
const textures = new Map();
const manifests = new Set();
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.name !== '.DS_Store') files.push(file);
  }
  return files;
}

const files = await walk(source);
for (const file of files.filter(
  (file) => path.basename(file) === 'manifest.json',
)) {
  const relative = path.relative(source, file);
  manifests.add(file);
  const original = JSON.parse(await readFile(file, 'utf8'));
  const shipped = JSON.parse(
    await readFile(path.join(output, relative), 'utf8'),
  );
  assert.equal(shipped.layers.length, original.layers.length, relative);
  for (const [index, layer] of shipped.layers.entries()) {
    const before = original.layers[index];
    const originalTexture = path.resolve(
      path.dirname(file),
      before.runtimeFile,
    );
    const target = path.resolve(
      output,
      path.dirname(relative),
      layer.runtimeFile,
    );
    assert(
      target.startsWith(`${output}${path.sep}`),
      'Texture escaped the Pages directory',
    );
    assert.deepEqual(
      await readFile(target),
      await readFile(originalTexture),
      `Texture pixels/encoding changed: ${relative}/${before.id}`,
    );
    textures.set(originalTexture, target);
    if (before.file)
      authoring.add(path.resolve(path.dirname(file), before.file));
    // The only permitted manifest change is the URL of an identical texture.
    layer.runtimeFile = before.runtimeFile;
  }
  assert.deepEqual(shipped, original, `Rig definition changed: ${relative}`);
}

// Everything outside the rewritten manifests and deduplicated/authoring layers
// must survive byte-for-byte, including fallback sprites, masks and all photos.
for (const file of files) {
  if (manifests.has(file) || textures.has(file) || authoring.has(file))
    continue;
  assert.deepEqual(
    await readFile(path.join(output, path.relative(source, file))),
    await readFile(file),
    `Public asset changed or missing: ${file}`,
  );
}
await stat(path.join(output, '.nojekyll'));
const unique = new Set(textures.values());
const sourceBytes = (
  await Promise.all([...textures.keys()].map((file) => stat(file)))
).reduce((sum, file) => sum + file.size, 0);
const shippedBytes = (
  await Promise.all([...unique].map((file) => stat(file)))
).reduce((sum, file) => sum + file.size, 0);
assert(shippedBytes < sourceBytes, 'Runtime texture deduplication did not run');
console.log(
  `PASS: ${manifests.size} unchanged rigs, ${textures.size} textures → ${unique.size} identical shared files; saved ${sourceBytes - shippedBytes} bytes. All other public assets preserved.`,
);
