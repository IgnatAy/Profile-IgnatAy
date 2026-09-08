/** Final face preparation: exact original neutral face, isolated mouth ink,
 * and one shared face grid at runtime. Run after the cutout preparation scripts. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const originals = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const generatedRoot = 'work/alice/speaking-mouths';
const specs = {
  idle: { center: [655.5, 731], closed: [638, 726, 36, 10], openSource: 'ARI_A_08_02_02-HD.png' },
  front: { center: [713, 736.5], closed: [701, 732, 25, 10], openSource: 'ARI_A_08_09_00-HD.png' },
  thinking: { center: [661, 741], closed: [645, 739, 33, 5], generated: [492, 478, 78, 51] },
  shy: { center: [308, 770.5], closed: [296, 768, 25, 6], generated: [552, 494, 81, 57] },
};
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
async function raw(input) { return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
async function save(root, id, data, width, height) {
  const png = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(`${root}/${id}.png`, png);
  await sharp(png).webp({ lossless: true, effort: 6 }).toFile(`${root}/${id}.webp`);
}
// Select only the lip/inner-mouth silhouette, filling enclosed tongue/teeth.
// The source rectangle never becomes a visible rectangle of skin.
async function inkPatch(input) {
  const { data, info } = await raw(input), w = info.width, h = info.height;
  const solid = new Uint8Array(w * h), outside = new Uint8Array(w * h), queue = [];
  for (let i = 0; i < solid.length; i++) solid[i] = data[i * 4 + 3] > 127 && Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < 225 ? 255 : 0;
  const add = i => { if (!outside[i] && !solid[i]) { outside[i] = 1; queue.push(i); } };
  for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % w, y = Math.floor(i / w);
    if (x) add(i - 1); if (x < w - 1) add(i + 1); if (y) add(i - w); if (y < h - 1) add(i + w);
  }
  for (let i = 0; i < solid.length; i++) if (!outside[i]) solid[i] = 255;
  const mask = await sharp(solid, { raw: { width: w, height: h, channels: 1 } }).blur(.55).extractChannel(0).raw().toBuffer();
  if (mask.length !== w * h) throw new Error('Mouth mask must have exactly one alpha sample per pixel');
  for (let i = 0; i < solid.length; i++) data[i * 4 + 3] = mask[i];
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}
async function prepare(pose, spec) {
  const root = `public/models/alice/layers${pose === 'idle' ? '' : '/' + pose}`;
  const manifest = JSON.parse(fs.readFileSync(`${root}/manifest.json`));
  const layer = id => manifest.layers.find(l => l.id === id);
  const original = path.join(originals, manifest.source);
  const headRect = layer('head'), mouthRect = layer('mouthClosed'), eyeRect = layer('eyesOpen');
  const head = await raw(`${root}/head.png`), hw = head.info.width, hh = head.info.height;
  const exact = await sharp(original).extract({ left: headRect.left, top: headRect.top, width: headRect.width, height: headRect.height }).resize(hw, hh, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
  const rest = Buffer.from(head.data);
  // The normal assembled face uses original opaque pixels throughout both
  // feature regions; it does not retain the old rectangular transparent holes.
  for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
    const nx = headRect.left + (x + .5) * headRect.width / hw, ny = headRect.top + (y + .5) * headRect.height / hh;
    if (![mouthRect, eyeRect].some(r => nx >= r.left - 12 && nx <= r.left + r.width + 12 && ny >= r.top - 12 && ny <= r.top + r.height + 12)) continue;
    const i = (y * hw + x) * 4;
    for (let c = 0; c < 4; c++) rest[i + c] = exact[i + c];
  }
  await save(root, 'headRest', rest, hw, hh);
  const restLayer = { ...headRect, id: 'headRest', file: 'headRest.png', runtimeFile: 'headRest.webp' };
  manifest.layers = manifest.layers.filter(l => l.id !== 'headRest'); manifest.layers.push(restLayer);

  const pasteMouth = async (patch, left, top, id) => {
    const canvas = await sharp({ create: { width: mouthRect.width, height: mouthRect.height, channels: 4, background: '#00000000' } }).composite([{ input: patch, left: Math.round(left - mouthRect.left), top: Math.round(top - mouthRect.top) }]).ensureAlpha().raw().toBuffer();
    await save(root, id, canvas, mouthRect.width, mouthRect.height);
  };
  const [cx, cy, cw, ch] = spec.closed, pad = 4;
  // Talking must replace the original lip line, not paint over it. Rebuild
  // only its small interior from adjacent skin on the same original pixel
  // grid. Feather into the unchanged face before adding the isolated ink.
  const talk = Buffer.from(rest);
  const px = (cx - headRect.left) * hw / headRect.width;
  const py = (cy - headRect.top) * hh / headRect.height;
  const pw = cw * hw / headRect.width, ph = ch * hh / headRect.height;
  const x0 = Math.floor(px - 4), x1 = Math.ceil(px + pw + 4);
  const y0 = Math.floor(py - 4), y1 = Math.ceil(py + ph + 4);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const feather = smooth(Math.min(x - x0, x1 - x, y - y0, y1 - y) / 3);
    const t = (y - y0) / (y1 - y0), i = (y * hw + x) * 4;
    for (let c = 0; c < 3; c++) {
      const skin = rest[(y0 * hw + x) * 4 + c] * (1 - t) + rest[(y1 * hw + x) * 4 + c] * t;
      talk[i + c] = Math.round(rest[i + c] * (1 - feather) + skin * feather);
    }
  }
  await save(root, 'headTalk', talk, hw, hh);
  manifest.layers = manifest.layers.filter(l => l.id !== 'headTalk');
  manifest.layers.push({ ...headRect, id: 'headTalk', file: 'headTalk.png', runtimeFile: 'headTalk.webp' });
  const closedCrop = await sharp(original).extract({ left: cx - pad, top: cy - pad, width: cw + 2 * pad, height: ch + 2 * pad }).png().toBuffer();
  await pasteMouth(await inkPatch(closedCrop), cx - pad, cy - pad, 'mouthClosed');
  if (spec.generated) {
    const [gx, gy, gw, gh] = spec.generated, gp = 8;
    const crop = await sharp(`${generatedRoot}/${pose}-open-generated.png`).extract({ left: gx - gp, top: gy - gp, width: gw + 2 * gp, height: gh + 2 * gp }).png().toBuffer();
    const cut = await inkPatch(crop);
    const width = Math.round((gw + 2 * gp) * 660 / 1254), height = Math.round((gh + 2 * gp) * 660 / 1254);
    const resized = await sharp(cut).resize(width, height).png().toBuffer();
    await pasteMouth(resized, spec.center[0] - width / 2, spec.center[1] - height / 2 + 2, 'mouth');
  } else {
    const open = await sharp(path.join(originals, spec.openSource)).extract({ left: mouthRect.left, top: mouthRect.top, width: mouthRect.width, height: mouthRect.height }).png().toBuffer();
    // Crop centrally so the old mouth rectangle cannot include the jawline.
    const w = 54, h = Math.min(34, mouthRect.height - 8), x = Math.round(spec.center[0] - w / 2), y = Math.round(spec.center[1] - h / 2);
    const cut = await sharp(open).extract({ left: x - mouthRect.left, top: y - mouthRect.top, width: w, height: h }).png().toBuffer();
    await pasteMouth(await inkPatch(cut), x, y, 'mouth');
  }
  if (manifest.rig) manifest.rig.mouth = true;
  manifest.faceRevision = 'unified-face-6';
  fs.writeFileSync(`${root}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${pose}: original neutral face; isolated closed/open mouth; talking enabled`);
}
(async () => { for (const [pose, spec] of Object.entries(specs)) await prepare(pose, spec); })().catch(e => { console.error(e); process.exit(1); });
