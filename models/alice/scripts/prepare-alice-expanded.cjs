/** Import the complete winter-outfit source set without changing the originals.
 * Run after the existing four rigs have been prepared. Uses inspected original
 * coordinates, source-only seam allowances and lossless facial textures. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { shapes: frontShapes } = require('./prepare-alice-front.cjs');
const { POSES } = require('./prepare-alice-thinking-shy.cjs');
const { preserveBlinkSkin } = require('./preserve-alice-blink-skin.cjs');
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/2';
const ROOT = path.resolve('public/models/alice');
const REVISION = 'native-poses-20260908-1';
const file = id => `ARI_A_08_${id}-HD.png`;
const source = id => path.join(SOURCE, file(id));
const rect = (left, top, width, height) => ({ left, top, width, height });
const read = input => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
const sideShapes = {
  head: 'M0 0 H1261 V750 H760 L722 808 L659 800 L649 842 Q604 872 550 851 L442 815 L365 785 H0 Z',
  hairLeft: 'M263 603 L564 545 L566 742 L571 856 L599 948 L521 923 L435 862 L374 825 L332 809 L291 759 Z',
  hairRight: 'M818 451 L903 450 L903 754 L875 857 L844 862 L822 834 L785 863 L764 827 L730 854 L702 837 L711 800 L760 740 L795 662 L816 620 L799 593 Z',
};
const sideRig = {
  headPivot: { x: 602, y: 847 }, bodyPivot: { x: 645, y: 2600 },
  bodyRigidUntil: 1250, bodyFixedFrom: 3250,
  hairLeft: { pin: 785, tip: 943 }, hairRight: { pin: 736, tip: 855 },
  bowPivot: { x: 650, y: 480 }, headGain: .55, nodGain: .45,
  arms: [{ spring: 'armBack', cx: 345, cy: 2300, rx: 230, ry: 490, ex: 392, ey: 1750 }],
};
const configs = {
  relaxed: {
    source: '08_01', shapes: frontShapes, dx: 21,
    headBox: rect(312, 0, 872, 1000), eyeBox: rect(532, 488, 408, 156), mouthBox: rect(696, 712, 80, 56),
    backingBox: rect(380, 740, 760, 290), half: '08_00', preserveBlinkSkin: true,
    // The generated front blink is retained only for this matching frontal head.
    eyeTemplate: 'front', eyeTemplateOffset: [21, 0],
    rig: {
      headPivot: { x: 739, y: 833 }, bodyPivot: { x: 751, y: 2850 },
      bodyRigidUntil: 1250, bodyFixedFrom: 3240,
      hairLeft: { pin: 830, tip: 950 }, hairRight: { pin: 833, tip: 946 },
      bowPivot: { x: 1049, y: 491 }, headGain: .9, nodGain: .8,
      arms: [
        { spring: 'armFront', cx: 1310, cy: 2380, rx: 175, ry: 430, ex: 1210, ey: 1750 },
        { spring: 'armBack', cx: 193, cy: 2380, rx: 175, ry: 430, ex: 293, ey: 1750 },
      ],
    },
    talk: '09_00', talkOffset: [21, 0],
  },
  side: {
    source: '14_00', shapes: sideShapes,
    headBox: rect(188, 0, 748, 980), eyeBox: rect(560, 448, 304, 164), mouthBox: rect(720, 680, 68, 56),
    backingBox: rect(300, 764, 580, 250), closed: '14_02', talk: '14_02', rig: sideRig,
  },
  'side-folded': {
    source: '16_00', shapes: sideShapes,
    headBox: rect(188, 0, 748, 980), eyeBox: rect(560, 448, 304, 164), mouthBox: rect(720, 680, 68, 56),
    backingBox: rect(300, 764, 580, 250), closed: '14_02', talk: '14_02',
    rig: { ...sideRig, arms: [
      { spring: 'armFront', cx: 745, cy: 2120, rx: 420, ry: 400, ex: 400, ey: 1740 },
    ] },
  },
  profile: {
    source: '17_00',
    shapes: {
      head: 'M0 0 H1308 V750 H984 L936 807 L866 800 L857 843 Q797 872 695 838 L656 808 L644 770 H0 Z',
      hairLeft: 'M465 609 L611 596 L626 767 L637 871 L669 926 L592 929 L534 886 L490 852 L435 862 L425 785 Z',
      hairRight: 'M611 601 L672 576 L676 686 L692 725 L681 773 L695 803 L727 829 L697 824 L678 800 L672 852 L653 829 L655 903 L643 927 L612 899 L598 831 L595 758 Z',
    },
    headBox: rect(400, 0, 748, 968), eyeBox: rect(772, 456, 284, 164), mouthBox: rect(932, 680, 68, 56),
    backingBox: rect(508, 764, 580, 250),
    // Swept-back hair changes the eye silhouette. Preserve this single original.
    rig: {
      ...sideRig, headPivot: { x: 814, y: 847 }, bodyPivot: { x: 857, y: 2600 },
      hairLeft: { pin: 768, tip: 930 }, hairRight: { pin: 763, tip: 920 },
      bowPivot: { x: 862, y: 480 }, headGain: .45, nodGain: .35,
      portraitCenterX: 820, portraitWidth: 1350,
      arms: [{ spring: 'armBack', cx: 557, cy: 2300, rx: 230, ry: 490, ex: 604, ey: 1750 }],
    },
  },
  leaning: {
    source: '20_00', shapes: POSES.shy.shapes,
    headBox: rect(0, 0, 780, 1080), eyeBox: rect(136, 544, 348, 116), mouthBox: rect(272, 740, 92, 56),
    backingBox: rect(64, 760, 672, 348), half: '20_01', closed: '19_00',
    rig: { ...POSES.shy.rig, headGain: .5, nodGain: .3, arms: [
      // The collar-gripping glove stays with the torso. Only the other forearm sways.
      { spring: 'armBack', cx: 797, cy: 1510, rx: 150, ry: 180, ex: 956, ey: 1450 },
    ] },
  },
};
async function save(root, id, data, width, height, body = false) {
  const png = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(path.join(root, `${id}.png`), png);
  let runtime = sharp(png);
  if (body) runtime = runtime.resize({ height: 3600, withoutEnlargement: true });
  await runtime.webp(body ? { quality: 95, alphaQuality: 100, effort: 4 } : { lossless: true, effort: 4 }).toFile(path.join(root, `${id}.webp`));
}
async function mask(shape, width, height, dx = 0) {
  if (!shape) return Buffer.alloc(width * height);
  const svg = `<svg width="${width}" height="${height}"><g transform="translate(${dx} 0)"><path d="${shape}" fill="white"/></g></svg>`;
  return sharp(Buffer.from(svg)).ensureAlpha().extractChannel(3).threshold(127).raw().toBuffer();
}
const pixel = (dst, i, src, j = i) => { for (let c = 0; c < 4; c++) dst[i * 4 + c] = src[j * 4 + c]; };
async function crop(input, box, offset = [0, 0]) {
  return sharp(input).extract({ ...box, left: box.left - offset[0], top: box.top - offset[1] }).ensureAlpha().raw().toBuffer();
}
// All expression changes are feathered inside their source-space rectangle;
// boundary pixels always come from the neutral original, never a new skin color.
function blendPatch(base, variant, box, pad = 6) {
  const data = Buffer.from(base);
  for (let y = 0; y < box.height; y++) for (let x = 0; x < box.width; x++) {
    const t = smooth((Math.min(x, y, box.width - 1 - x, box.height - 1 - y) - 2) / pad);
    const i = (y * box.width + x) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = Math.round(base[i + c] * (1 - t) + variant[i + c] * t);
  }
  return data;
}
async function prepare(pose, conf) {
  const { data: original, info } = await read(source(conf.source));
  const W = info.width, H = info.height, size = W * H;
  const root = path.join(ROOT, 'layers', pose); fs.mkdirSync(root, { recursive: true });
  const ids = ['body', 'head', 'hairLeft', 'hairRight', 'bow'];
  const masks = {};
  for (const id of ids.slice(1)) masks[id] = await mask(conf.shapes[id], W, H, conf.dx);
  for (const id of ['hairLeft', 'hairRight']) for (let i = 0; i < size; i++) {
    if (Math.max(original[i * 4], original[i * 4 + 1], original[i * 4 + 2]) > 145) masks[id][i] = 0;
  }
  const parts = Object.fromEntries([...ids, 'backing'].map(id => [id, Buffer.alloc(original.length)]));
  const owner = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    if (!original[i * 4 + 3]) continue;
    let id = 'body';
    for (const part of ids.slice(1)) if (masks[part][i]) id = part;
    owner[i] = ids.indexOf(id); pixel(parts[id], i, original);
  }
  // Prove that extraction does not omit or duplicate any original opaque pixel.
  let owned = 0;
  for (let i = 0; i < size; i++) if (original[i * 4 + 3]) {
    const part = parts[ids[owner[i]]];
    for (let c = 0; c < 4; c++) assert.equal(part[i * 4 + c], original[i * 4 + c]);
    owned++;
  }
  // Extend visible source pixels under opaque neighboring cutouts. Never extend
  // beyond the source silhouette; these gutters are hidden in the neutral pose.
  for (const [from, into, area, limit] of [
    ['body', 'backing', conf.backingBox, 26],
    ['head', 'head', { ...conf.headBox, top: 440, height: conf.headBox.height - 440 }, 14],
  ]) {
    const seeds = Buffer.from(parts[from]);
    for (let y = area.top; y < area.top + area.height; y++) for (let x = area.left; x < area.left + area.width; x++) {
      const i = y * W + x;
      if (seeds[i * 4 + 3] || original[i * 4 + 3] !== 255 || owner[i] === 0) continue;
      if (from === 'head' && owner[i] === 1) continue;
      let nearest = -1;
      for (let d = 1; d <= limit && nearest < 0; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        if (x + dx < 0 || x + dx >= W || y + dy < 0 || y + dy >= H) continue;
        const j = (y + dy) * W + x + dx;
        if (seeds[j * 4 + 3] === 255) { nearest = j; break; }
      }
      if (nearest >= 0) pixel(parts[into], i, seeds, nearest);
    }
  }
  const manifest = { width: W, height: H, source: file(conf.source), faceRevision: REVISION, layers: [], rig: { ...conf.rig, blink: !!(conf.closed || conf.eyeTemplate), mouth: !!conf.talk } };
  const add = async (id, data, box, body = false) => {
    await save(root, id, data, box.width, box.height, body);
    manifest.layers.push({ id, file: `${id}.png`, runtimeFile: `${id}.webp`, ...box });
  };
  for (const id of [...ids, 'backing']) {
    const box = id === 'body' ? rect(0, 0, W, H) : id === 'backing' ? conf.backingBox : conf.headBox;
    const data = await sharp(parts[id], { raw: { width: W, height: H, channels: 4 } }).extract(box).raw().toBuffer();
    if (id === 'head') {
      await add('headRest', data, box);
      // Source mouth patches cover the complete lip line, so no synthesized
      // clean-face texture is needed for these original talking frames.
      await add('headTalk', data, box);
      // The debug/exploded base has genuine feature holes, so separating the
      // eye and mouth layers never leaves a second copy on the head.
      for (const feature of [conf.eyeBox, conf.mouthBox]) {
        for (let y = feature.top; y < feature.top + feature.height; y++)
          for (let x = feature.left; x < feature.left + feature.width; x++)
            data[((y - box.top) * box.width + x - box.left) * 4 + 3] = 0;
      }
    }
    await add(id, data, box, id === 'body');
  }
  const { eyes, half, closed } = await prepareEyes(conf);
  await add('eyesOpen', eyes, conf.eyeBox); await add('eyesHalf', half, conf.eyeBox); await add('eyesClosed', closed, conf.eyeBox);
  const mouth = await crop(source(conf.source), conf.mouthBox);
  const talking = conf.talk ? blendPatch(mouth, await crop(source(conf.talk), conf.mouthBox, conf.talkOffset), conf.mouthBox) : mouth;
  await add('mouthClosed', mouth, conf.mouthBox); await add('mouth', talking, conf.mouthBox);
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await sharp(source(conf.source)).resize({ height: 2400 }).webp({ quality: 92, alphaQuality: 100, effort: 4 }).toFile(path.join(ROOT, `${pose}.webp`));
  console.log(`${pose}: ${owned} source pixels assigned exactly; ${manifest.layers.length} textures; blink=${manifest.rig.blink}, mouth=${manifest.rig.mouth}`);
}
async function prepareEyes(conf) {
  const eyes = await crop(source(conf.source), conf.eyeBox);
  let closed = eyes;
  if (conf.closed) closed = blendPatch(eyes, await crop(source(conf.closed), conf.eyeBox), conf.eyeBox);
  else if (conf.eyeTemplate) {
    const templateRoot = path.join(ROOT, 'layers', conf.eyeTemplate);
    const m = JSON.parse(fs.readFileSync(path.join(templateRoot, 'manifest.json')));
    const e = m.layers.find(l => l.id === 'eyesClosed');
    const patch = await sharp(path.join(templateRoot, e.runtimeFile)).resize(e.width, e.height).png().toBuffer();
    const [dx, dy] = conf.eyeTemplateOffset;
    // Existing frontal eye patch is alpha masked and registered by hat/face landmarks.
    closed = await sharp(eyes, { raw: { width: conf.eyeBox.width, height: conf.eyeBox.height, channels: 4 } }).composite([{ input: patch, left: e.left + dx - conf.eyeBox.left, top: e.top + dy - conf.eyeBox.top }]).raw().toBuffer();
  }
  let half = conf.half ? blendPatch(eyes, await crop(source(conf.half), conf.eyeBox), conf.eyeBox) : closed;
  if (conf.preserveBlinkSkin) {
    half = preserveBlinkSkin(eyes, half, conf.eyeBox);
    closed = preserveBlinkSkin(eyes, closed, conf.eyeBox);
  }
  return { eyes, half, closed };
}
async function updateOriginalEyes(pose, baseId, halfId, closedId, eyeBox) {
  const root = path.join(ROOT, 'layers', pose), manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  const head = manifest.layers.find(l => l.id === 'headRest');
  const originalSource = manifest.source;
  if (baseId) {
    // Replace the original closed-eye neutral face, retaining the established
    // alpha ownership and the separately prepared open mouth texture.
    for (const id of ['head', 'headRest', 'headTalk']) {
      const old = await read(path.join(root, `${id}.png`));
      const exact = await sharp(source(baseId)).extract(rect(head.left, head.top, head.width, head.height)).resize(old.info.width, old.info.height).ensureAlpha().raw().toBuffer();
      const sx = old.info.width / head.width, sy = old.info.height / head.height;
      for (let y = 0; y < old.info.height; y++) for (let x = 0; x < old.info.width; x++) {
        const nx = head.left + (x + .5) / sx, ny = head.top + (y + .5) / sy;
        if (nx < eyeBox.left - 10 || nx > eyeBox.left + eyeBox.width + 10 || ny < eyeBox.top - 10 || ny > eyeBox.top + eyeBox.height + 10) continue;
        const i = (y * old.info.width + x) * 4;
        for (let c = 0; c < 3; c++) old.data[i + c] = exact[i + c];
        if (id !== 'head') old.data[i + 3] = exact[i + 3];
      }
      await save(root, id, old.data, old.info.width, old.info.height);
    }
    // The old closed-eye cutout accidentally assigned some dark eyelash pixels
    // to a hair mask. Give this fixed-root feature region entirely to the new
    // unified face, otherwise those old lashes remain below the open pupils.
    for (const id of ['hairLeft', 'hairRight']) {
      const layer = manifest.layers.find(l => l.id === id);
      const hair = await read(path.join(root, `${id}.png`));
      for (let y = 0; y < hair.info.height; y++) for (let x = 0; x < hair.info.width; x++) {
        const nx = layer.left + (x + .5) * layer.width / hair.info.width;
        const ny = layer.top + (y + .5) * layer.height / hair.info.height;
        if (nx >= eyeBox.left - 9 && nx <= eyeBox.left + eyeBox.width + 9 && ny >= eyeBox.top - 9 && ny <= eyeBox.top + eyeBox.height + 9)
          hair.data[(y * hair.info.width + x) * 4 + 3] = 0;
      }
      await save(root, id, hair.data, hair.info.width, hair.info.height);
    }
    // Mouth stays matched to the previously prepared neutral source.
    manifest.source = file(baseId);
    await sharp(source(baseId)).resize({ height: 2400 }).webp({ quality: 92, alphaQuality: 100, effort: 4 }).toFile(path.join(ROOT, `${pose}.webp`));
  }
  const neutral = await crop(baseId ? source(baseId) : path.join(SOURCE, originalSource), eyeBox);
  for (const [id, native] of [['eyesOpen', baseId], ['eyesHalf', halfId || closedId], ['eyesClosed', closedId]]) {
    const data = native ? blendPatch(neutral, await crop(source(native), eyeBox), eyeBox) : neutral;
    await save(root, id, data, eyeBox.width, eyeBox.height);
    Object.assign(manifest.layers.find(l => l.id === id), eyeBox);
  }
  manifest.rig.blink = true; manifest.faceRevision = REVISION;
  manifest.eyeSources = { open: baseId ? file(baseId) : originalSource, half: file(halfId || closedId), closed: file(closedId) };
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${pose}: native open/half/closed eye frames installed`);
}
async function main() {
  if (process.argv.includes('--relaxed-eyes-only')) {
    const conf = configs.relaxed, frames = await prepareEyes(conf);
    for (const [id, data] of [['eyesHalf', frames.half], ['eyesClosed', frames.closed]])
      await save(path.join(ROOT, 'layers/relaxed'), id, data, conf.eyeBox.width, conf.eyeBox.height);
    console.log('relaxed: blink textures rebuilt with original blush; other layers preserved');
    return;
  }
  // Validate the whole requested source set before writing any runtime assets.
  for (const id of ['02_00', '02_01', '02_02', '03_00', '03_01', '03_02', '03_03', '08_00', '08_01', '09_00', '09_01', '14_00', '14_01', '14_02', '16_00', '17_00', '19_00', '19_01', '20_00', '20_01']) assert(fs.existsSync(source(id)), `Missing ${source(id)}`);
  for (const [pose, conf] of Object.entries(configs)) await prepare(pose, conf);
  await updateOriginalEyes('thinking', '03_00', '03_02', '03_03', rect(420, 488, 396, 172));
  await updateOriginalEyes('shy', null, null, '19_00', rect(128, 492, 372, 172));
}
module.exports = { configs, updateOriginalEyes };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
