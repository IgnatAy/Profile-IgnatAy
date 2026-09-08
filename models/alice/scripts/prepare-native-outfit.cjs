/** Shared native-pixel cutout pipeline for supplied outfit sprites.
 * Source art is read-only; each outfit provides its own anatomy and expressions. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const rect = (left, top, width, height) => ({ left, top, width, height });
function createNativeOutfitPreparer({
  sourceDirectory: SOURCE,
  outputDirectory: OUT,
  reviewDirectory: WORK,
  revision: REVISION,
  file,
}) {
  const source = (id) => path.join(SOURCE, file(id));
  const read = (input) =>
    sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const smooth = (t) => {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };
  const copy = (dst, i, src, j = i) => {
    for (let c = 0; c < 4; c++) dst[i * 4 + c] = src[j * 4 + c];
  };
  async function mask(shape, w, h, dx = 0) {
    if (!shape) return Buffer.alloc(w * h);
    return sharp(
      Buffer.from(
        `<svg width="${w}" height="${h}"><g transform="translate(${dx} 0)"><path d="${shape}" fill="white"/></g></svg>`,
      ),
    )
      .ensureAlpha()
      .extractChannel(3)
      .threshold(127)
      .raw()
      .toBuffer();
  }
  async function save(root, id, data, w, h, body = false) {
    const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(root, id + '.png'), png);
    let q = sharp(png);
    if (body) q = q.resize({ height: 3600, withoutEnlargement: true });
    await q
      .webp(
        body
          ? { quality: 95, alphaQuality: 100, effort: 4 }
          : { lossless: true, effort: 4 },
      )
      .toFile(path.join(root, id + '.webp'));
  }
  async function crop(file, box, offset = [0, 0]) {
    return sharp(file)
      .extract({ ...box, left: box.left - offset[0], top: box.top - offset[1] })
      .ensureAlpha()
      .raw()
      .toBuffer();
  }
  function blend(base, variant, box) {
    const dst = Buffer.from(base);
    for (let y = 0; y < box.height; y++)
      for (let x = 0; x < box.width; x++) {
        const t = smooth(
            (Math.min(x, y, box.width - 1 - x, box.height - 1 - y) - 2) / 8,
          ),
          i = (y * box.width + x) * 4;
        for (let c = 0; c < 3; c++)
          dst[i + c] = Math.round(base[i + c] * (1 - t) + variant[i + c] * t);
      }
    return dst;
  }
  async function prepare(name, conf) {
    const { data: original, info } = await read(source(conf.source));
    const W = info.width,
      H = info.height,
      N = W * H;
    const root = path.join(OUT, 'layers', name === 'idle' ? '' : name);
    fs.mkdirSync(root, { recursive: true });
    const ids = ['body', 'head', 'hairLeft', 'hairRight', 'bow'];
    const masks = {
      head: await mask(
        conf.headShape ||
          `M${conf.headBox.left} 0 H${conf.headBox.left + conf.headBox.width} V${conf.headBottom} H${conf.headBox.left} Z`,
        W,
        H,
      ),
      hairLeft: await mask(conf.hairLeft, W, H, conf.shapeDx),
      hairRight: await mask(conf.hairRight, W, H, conf.shapeDx),
      bow: Buffer.alloc(N),
    };
    const skinMask = Buffer.alloc(N);
    for (let y = conf.skin.top; y < conf.skin.top + conf.skin.height; y++)
      for (let x = conf.skin.left; x < conf.skin.left + conf.skin.width; x++) {
        const i = y * W + x;
        if (
          original[i * 4] > original[i * 4 + 2] + 25 &&
          original[i * 4 + 1] > original[i * 4 + 2] + 8
        )
          skinMask[i] = 255;
      }
    // Include the painted dark chin contour and antialiasing with the face.
    const skinOutline = await sharp(skinMask, {
      raw: { width: W, height: H, channels: 1 },
    })
      .erode(5)
      .extractChannel(0)
      .raw()
      .toBuffer();
    for (let i = 0; i < N; i++) if (skinOutline[i]) masks.head[i] = 255;
    if (conf.headLower) {
      const extra = await mask(conf.headLower, W, H);
      for (let i = 0; i < N; i++) if (extra[i]) masks.head[i] = 255;
    }
    for (const id of ['hairLeft', 'hairRight'])
      for (let i = 0; i < N; i++)
        if (
          Math.max(original[i * 4], original[i * 4 + 1], original[i * 4 + 2]) >
          150
        )
          masks[id][i] = 0;
    // The entire feature rectangle stays rigid, including roots/fringe inside it.
    for (const b of [conf.eyeBox, conf.mouthBox])
      for (let y = b.top; y < b.top + b.height; y++)
        for (let x = b.left; x < b.left + b.width; x++) {
          const i = y * W + x;
          masks.head[i] = 255;
          masks.hairLeft[i] = masks.hairRight[i] = 0;
        }
    const parts = Object.fromEntries(
      [...ids, 'backing'].map((id) => [id, Buffer.alloc(original.length)]),
    );
    const owner = new Uint8Array(N);
    let owned = 0;
    for (let i = 0; i < N; i++) {
      if (!original[i * 4 + 3]) continue;
      let id = 'body';
      for (const p of ids.slice(1)) if (masks[p][i]) id = p;
      owner[i] = ids.indexOf(id);
      copy(parts[id], i, original);
      owned++;
    }
    // Keep loose antialiased hair tips with the moving head. Any body island in
    // the head band that has no connection to the torso is a cutout remainder.
    const bandHeight = conf.headBox.height,
      bandSize = W * bandHeight,
      reached = new Uint8Array(bandSize),
      queue = new Uint32Array(bandSize);
    let q0 = 0,
      q1 = 0;
    for (let x = 0; x < W; x++) {
      const i = (bandHeight - 1) * W + x;
      if (owner[i] === 0 && original[i * 4 + 3]) {
        reached[i] = 1;
        queue[q1++] = i;
      }
    }
    while (q0 < q1) {
      const i = queue[q0++],
        x = i % W;
      for (const j of [x ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W])
        if (
          j >= 0 &&
          j < bandSize &&
          !reached[j] &&
          owner[j] === 0 &&
          original[j * 4 + 3]
        ) {
          reached[j] = 1;
          queue[q1++] = j;
        }
    }
    let detachedTipPixels = 0;
    for (let i = 0; i < bandSize; i++)
      if (
        owner[i] === 0 &&
        original[i * 4 + 3] &&
        !reached[i] &&
        i % W >= conf.headBox.left &&
        i % W < conf.headBox.left + conf.headBox.width
      ) {
        copy(parts.head, i, original);
        parts.body[i * 4 + 3] = 0;
        owner[i] = 1;
        detachedTipPixels++;
      }
    // Exact disjoint reconstruction before hidden seam allowances.
    let mismatch = 0;
    for (let i = 0; i < N; i++)
      if (original[i * 4 + 3])
        for (let c = 0; c < 4; c++)
          if (parts[ids[owner[i]]][i * 4 + c] !== original[i * 4 + c])
            mismatch++;
    assert.equal(mismatch, 0);
    for (const [from, into, box, limit] of [
      ['body', 'backing', conf.backingBox, 28],
      [
        'head',
        'head',
        rect(
          conf.headBox.left,
          700,
          conf.headBox.width,
          conf.headBox.height - 700,
        ),
        16,
      ],
    ]) {
      const seed = Buffer.from(parts[from]);
      for (let y = box.top; y < box.top + box.height; y++)
        for (let x = box.left; x < box.left + box.width; x++) {
          const i = y * W + x;
          if (seed[i * 4 + 3] || original[i * 4 + 3] !== 255 || owner[i] === 0)
            continue;
          if (from === 'head' && owner[i] === 1) continue;
          let near = -1;
          for (let d = 1; d <= limit && near < 0; d++)
            for (const [dx, dy] of [
              [d, 0],
              [-d, 0],
              [0, d],
              [0, -d],
            ]) {
              if (x + dx < 0 || x + dx >= W || y + dy < 0 || y + dy >= H)
                continue;
              const j = (y + dy) * W + x + dx;
              if (seed[j * 4 + 3] === 255) {
                near = j;
                break;
              }
            }
          if (near >= 0) copy(parts[into], i, seed, near);
        }
    }
    const manifest = {
      width: W,
      height: H,
      source: file(conf.source),
      faceRevision: REVISION,
      layers: [],
      rig: {
        ...conf.rig,
        bowPivot: { x: conf.rig.headPivot.x, y: 410 },
        blink: !!conf.closed,
        mouth: !!conf.talk,
      },
      eyeSources: {
        open: file(conf.source),
        half: file(conf.half || conf.closed || conf.source),
        closed: file(conf.closed || conf.source),
      },
      mouthSource: conf.talk ? file(conf.talk) : null,
    };
    async function add(id, data, box, body = false) {
      await save(root, id, data, box.width, box.height, body);
      manifest.layers.push({
        id,
        file: id + '.png',
        runtimeFile: id + '.webp',
        ...box,
      });
    }
    for (const id of [...ids, 'backing']) {
      const box =
        id === 'body'
          ? rect(0, 0, W, H)
          : id === 'backing'
            ? conf.backingBox
            : conf.headBox;
      const data = await sharp(parts[id], {
        raw: { width: W, height: H, channels: 4 },
      })
        .extract(box)
        .raw()
        .toBuffer();
      if (id === 'head') {
        await add('headRest', data, box);
        await add('headTalk', data, box);
        for (const f of [conf.eyeBox, conf.mouthBox])
          for (let y = f.top; y < f.top + f.height; y++)
            for (let x = f.left; x < f.left + f.width; x++)
              data[((y - box.top) * box.width + x - box.left) * 4 + 3] = 0;
      }
      await add(id, data, box, id === 'body');
    }
    const eye = await crop(source(conf.source), conf.eyeBox);
    for (const [id, variant, offset] of [
      ['eyesOpen', null, [0, 0]],
      [
        'eyesHalf',
        conf.half || conf.closed,
        conf.half ? conf.halfOffset : conf.closedOffset,
      ],
      ['eyesClosed', conf.closed, conf.closedOffset],
    ]) {
      const patch = variant
        ? blend(
            eye,
            await crop(source(variant), conf.eyeBox, offset),
            conf.eyeBox,
          )
        : eye;
      if (conf.keepEyeAbove && variant)
        for (let y = 0; y < conf.keepEyeAbove - conf.eyeBox.top + 8; y++)
          for (let x = 0; x < conf.eyeBox.width; x++) {
            const i = (y * conf.eyeBox.width + x) * 4,
              t = smooth((y - (conf.keepEyeAbove - conf.eyeBox.top)) / 8);
            for (let c = 0; c < 3; c++)
              patch[i + c] = Math.round(
                eye[i + c] * (1 - t) + patch[i + c] * t,
              );
          }
      await add(id, patch, conf.eyeBox);
    }
    const mouth = await crop(source(conf.source), conf.mouthBox);
    await add('mouthClosed', mouth, conf.mouthBox);
    await add(
      'mouth',
      conf.talk
        ? blend(
            mouth,
            await crop(source(conf.talk), conf.mouthBox, conf.talkOffset),
            conf.mouthBox,
          )
        : mouth,
      conf.mouthBox,
    );
    fs.writeFileSync(
      path.join(root, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
    );
    await sharp(source(conf.source))
      .resize({ height: 2400 })
      .webp({ quality: 92, alphaQuality: 100, effort: 4 })
      .toFile(path.join(OUT, name + '.webp'));
    const b = conf.headBox;
    const annotation = Buffer.from(
      `<svg width="${b.width}" height="${b.height}"><g transform="translate(${-b.left} 0)">${[
        ['hairLeft', '#32ee67'],
        ['hairRight', '#4387ff'],
      ]
        .map(
          ([id, color]) =>
            `<path d="${conf[id]}" transform="translate(${conf.shapeDx || 0} 0)" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="2"/>`,
        )
        .join('')}</g></svg>`,
    );
    await sharp(source(conf.source))
      .extract(b)
      .flatten({ background: '#d8d2cc' })
      .composite([{ input: annotation }])
      .png()
      .toFile(path.join(WORK, name + '-mask.png'));
    await sharp(parts.body, { raw: { width: W, height: H, channels: 4 } })
      .extract(
        rect(
          Math.max(0, b.left - 100),
          650,
          Math.min(W - Math.max(0, b.left - 100), b.width + 200),
          600,
        ),
      )
      .flatten({ background: '#d8d2cc' })
      .png()
      .toFile(path.join(WORK, name + '-body-cut.png'));

    fs.writeFileSync(
      path.join(WORK, name + '-report.json'),
      JSON.stringify(
        {
          source: file(conf.source),
          ownedSourcePixels: owned,
          detachedTipPixels,
          reconstructionMismatches: mismatch,
          layers: manifest.layers.length,
          blink: manifest.rig.blink,
          mouth: manifest.rig.mouth,
        },
        null,
        2,
      ),
    );
    console.log(
      `${name}: source ownership verified; native outfit layers prepared`,
    );
  }

  return prepare;
}
module.exports = { createNativeOutfitPreparer };
