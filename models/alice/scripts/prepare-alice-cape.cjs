/** Cape outfit: exact original pixel ownership, native expression patches, conservative motion.
 * No generated art. Native source PNGs remain unchanged. */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation script. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { preparePendants } = require('./prepare-alice-pendants.cjs');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const SOURCE = process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/4';
const OUT =
  process.env.ALICE_CAPE_OUTPUT_DIR || path.resolve('public/models/alice-cape');
const WORK =
  process.env.ALICE_CAPE_REVIEW_DIR || path.resolve('work/alice/cape');
const REVISION = 'cape-native-20260908-2';
const rect = (left, top, width, height) => ({ left, top, width, height });
const file = (id) => `ARI_A_13_${id}-HD.png`;
const source = (id) => path.join(SOURCE, file(id));
const read = (input) =>
  sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const configs = {
  idle: {
    source: '02_00',
    half: '02_01',
    closed: '02_02',
    headBox: rect(460, 0, 830, 1100),
    eyeBox: rect(600, 510, 470, 180),
    mouthBox: rect(800, 764, 84, 70),
    skin: rect(640, 760, 420, 140),
    headBottom: 835,
    hairLeft:
      'M580 555 L648 561 L676 680 L708 739 L758 801 L785 837 L780 940 L765 965 L753 997 L741 997 L736 1048 L707 1006 L701 1042 L676 1018 L674 1061 L639 1056 L610 950 L596 775 Z',
    hairRight:
      'M1008 476 L1244 470 L1245 720 L1232 817 L1201 918 L1187 891 L1169 943 L1158 920 L1142 974 L1115 976 L1093 999 L1057 1015 L1000 1048 L1004 967 L1011 868 Z',
    backingBox: rect(580, 800, 690, 350),
    rig: {
      headPivot: { x: 871, y: 879 },
      bodyPivot: { x: 894, y: 2850 },
      bodyRigidUntil: 1390,
      bodyFixedFrom: 3570,
      hairLeft: { pin: 873, tip: 1060 },
      hairRight: { pin: 875, tip: 1048 },
      headGain: 0.42,
      nodGain: 0.3,
      arms: [
        {
          spring: 'armFront',
          cx: 1335,
          cy: 2430,
          rx: 230,
          ry: 420,
          ex: 1300,
          ey: 2070,
        },
        {
          spring: 'armBack',
          cx: 407,
          cy: 2330,
          rx: 210,
          ry: 390,
          ex: 477,
          ey: 2040,
        },
      ],
    },
  },
  relaxed: {
    source: '08_00',
    half: '08_02',
    closed: '08_03',
    talk: '08_04',
    headBox: rect(510, 0, 800, 1060),
    eyeBox: rect(672, 510, 466, 174),
    mouthBox: rect(856, 763, 97, 63),
    skin: rect(700, 760, 420, 140),
    headBottom: 815,
    hairLeft:
      'M589 511 L699 531 L713 690 L762 775 L800 821 L786 887 L800 970 L794 1004 L746 983 L712 973 L684 936 L675 955 L652 950 L624 901 L611 807 L596 671 Z',
    hairRight:
      'M1090 520 L1227 509 L1220 708 L1206 813 L1176 896 L1174 929 L1144 967 L1122 977 L1107 1002 L1074 984 L1032 1003 L1026 969 L1047 904 L1071 821 L1085 742 Z',
    backingBox: rect(590, 790, 650, 310),
    rig: {
      headPivot: { x: 899, y: 881 },
      bodyPivot: { x: 905, y: 2850 },
      bodyRigidUntil: 1370,
      bodyFixedFrom: 3460,
      hairLeft: { pin: 832, tip: 1005 },
      hairRight: { pin: 834, tip: 1004 },
      headGain: 0.42,
      nodGain: 0.3,
      arms: [
        {
          spring: 'armFront',
          cx: 1470,
          cy: 2340,
          rx: 220,
          ry: 370,
          ex: 1390,
          ey: 2050,
        },
        {
          spring: 'armBack',
          cx: 395,
          cy: 2350,
          rx: 220,
          ry: 370,
          ex: 455,
          ey: 2050,
        },
      ],
    },
  },
  side: {
    source: '14_00',
    closed: '14_02',
    headBox: rect(270, 0, 820, 1080),
    eyeBox: rect(620, 528, 360, 188),
    mouthBox: rect(819, 744, 158, 92),
    skin: rect(664, 774, 300, 160),
    headBottom: 842,
    hairLeft:
      'M358 557 L682 490 L686 735 L692 847 L699 947 L716 1045 L647 1037 L612 1017 L577 1005 L535 993 L514 968 L492 938 L473 919 L444 884 L419 882 L389 817 L376 731 Z',
    hairRight:
      'M922 636 L968 499 L1022 431 L1035 615 L1028 785 L1021 891 L1007 960 L992 954 L977 931 L963 948 L958 919 L936 946 L921 938 L902 965 L885 936 L861 941 L851 920 L883 842 L911 776 Z',
    backingBox: rect(390, 850, 630, 290),
    rig: {
      headPivot: { x: 778, y: 913 },
      bodyPivot: { x: 775, y: 2830 },
      bodyRigidUntil: 1420,
      bodyFixedFrom: 3470,
      hairLeft: { pin: 875, tip: 1045 },
      hairRight: { pin: 820, tip: 965 },
      headGain: 0.35,
      nodGain: 0.25,
      arms: [
        {
          spring: 'armBack',
          cx: 735,
          cy: 2430,
          rx: 225,
          ry: 400,
          ex: 682,
          ey: 2090,
        },
      ],
    },
  },
  'side-folded': {
    source: '16_00',
    closed: '16_02',
    talk: '16_02',
    inherit: 'side',
    rigOverride: {
      arms: [
        {
          spring: 'armBack',
          cx: 1110,
          cy: 2240,
          rx: 170,
          ry: 300,
          ex: 998,
          ey: 2080,
        },
      ],
    },
  },
  profile: {
    source: '17_00',
    half: '17_01',
    closed: '17_03',
    talk: '17_04',
    headLower: 'M1080 811 H1132 V874 Q1107 931 1151 1018 H1110 L1080 982 Z',
    headBox: rect(755, 0, 900, 1090),
    eyeBox: rect(1152, 525, 386, 206),
    mouthBox: rect(1375, 773, 140, 82),
    skin: rect(1125, 768, 400, 164),
    headBottom: 842,
    hairLeft:
      'M895 566 L1120 510 L1138 620 L1108 719 L1086 821 L1082 922 L1092 1002 L1060 989 L1019 986 L1007 947 L982 965 L953 935 L943 901 L921 930 L895 910 L877 873 L862 835 L841 860 L825 804 L788 854 L783 783 L815 716 L850 646 Z',
    hairRight:
      'M1118 615 L1164 562 L1195 523 L1185 678 L1163 743 L1155 788 L1167 809 L1144 828 L1163 871 L1162 904 L1186 932 L1167 949 L1150 916 L1134 901 L1120 846 L1110 774 L1113 722 Z',
    backingBox: rect(960, 837, 615, 310),
    rig: {
      headPivot: { x: 1266, y: 915 },
      bodyPivot: { x: 1220, y: 2790 },
      bodyRigidUntil: 1430,
      bodyFixedFrom: 3470,
      hairLeft: { pin: 830, tip: 1003 },
      hairRight: { pin: 813, tip: 950 },
      headGain: 0.28,
      nodGain: 0.2,
      portraitCenterX: 1240,
      portraitWidth: 1670,
      arms: [
        {
          spring: 'armBack',
          cx: 1360,
          cy: 2470,
          rx: 200,
          ry: 390,
          ex: 1305,
          ey: 2140,
        },
      ],
    },
  },
  shy: {
    source: '19_03',
    closed: '19_02',
    talk: '19_01',
    headBox: rect(140, 0, 800, 1050),
    eyeBox: rect(286, 476, 484, 180),
    mouthBox: rect(470, 724, 110, 78),
    skin: rect(313, 690, 435, 170),
    headBottom: 746,
    hairLeft:
      'M224 458 L309 499 L348 650 L396 731 L437 774 L442 813 L435 866 L423 896 L411 865 L406 929 L390 905 L385 968 L362 955 L361 1001 L329 983 L303 987 L290 936 L271 882 L252 736 Z',
    hairRight:
      'M685 463 L894 478 L895 671 L883 761 L860 814 L837 862 L810 893 L800 910 L762 944 L744 948 L698 992 L678 995 L663 1005 L640 1007 L654 965 L671 933 L680 856 Z',
    backingBox: rect(215, 745, 705, 355),
    rig: {
      headPivot: { x: 557, y: 833 },
      bodyPivot: { x: 1150, y: 2510 },
      bodyRigidUntil: 1310,
      bodyFixedFrom: 3200,
      hairLeft: { pin: 845, tip: 1002 },
      hairRight: { pin: 829, tip: 1008 },
      headGain: 0.32,
      nodGain: 0.2,
      portraitCenterX: 735,
      portraitWidth: 1610,
      arms: [
        {
          spring: 'armFront',
          cx: 935,
          cy: 2380,
          rx: 275,
          ry: 390,
          ex: 963,
          ey: 2020,
        },
        {
          spring: 'armBack',
          cx: 580,
          cy: 2090,
          rx: 190,
          ry: 300,
          ex: 475,
          ey: 1850,
        },
      ],
    },
  },
  leaning: {
    source: '20_01',
    half: null,
    keepEyeAbove: 535,
    closed: '19_02',
    closedOffset: [-88, 0],
    talk: '20_02',
    inherit: 'shy',
    dx: -88,
    rigOverride: {
      headGain: 0.22,
      nodGain: 0.1,
      bodyPivot: { x: 1062, y: 2510 },
      portraitCenterX: 650,
      portraitWidth: 1590,
      arms: [
        {
          spring: 'armBack',
          cx: 963,
          cy: 1500,
          rx: 250,
          ry: 190,
          ex: 1060,
          ey: 1400,
        },
      ],
    },
  },
};
for (const [name, c] of Object.entries(configs))
  if (c.inherit) {
    const p = configs[c.inherit],
      dx = c.dx || 0;
    const shift = (b) => ({ ...b, left: b.left + dx });
    const shiftRig = {
      ...p.rig,
      headPivot: { x: p.rig.headPivot.x + dx, y: p.rig.headPivot.y },
    };
    configs[name] = {
      ...p,
      ...c,
      headBox: shift(p.headBox),
      eyeBox: shift(p.eyeBox),
      mouthBox: shift(p.mouthBox),
      skin: shift(p.skin),
      backingBox: shift(p.backingBox),
      rig: { ...shiftRig, ...c.rigOverride },
      shapeDx: dx,
      half: c.half || null,
      talk: c.talk || null,
      closed: c.closed || null,
    };
  }
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
  // A full-body color effect retains the matching neutral source's anatomy.
  // Inferring skin from a darkened face would split its chin into the torso.
  const anatomy = conf.maskSource ? await read(source(conf.maskSource)) : null;
  if (anatomy)
    assert.deepEqual(
      anatomy.info,
      info,
      'Mask source must use the same native canvas',
    );
  const maskPixels = anatomy?.data ?? original;
  const W = info.width,
    H = info.height,
    N = W * H;
  const root = path.join(OUT, 'layers', name === 'idle' ? '' : name);
  fs.mkdirSync(root, { recursive: true });
  const ids = ['body', 'head', 'hairLeft', 'hairRight', 'bow'];
  const masks = {
    head: await mask(`M0 0 H${W} V${conf.headBottom} H0 Z`, W, H),
    hairLeft: await mask(conf.hairLeft, W, H, conf.shapeDx),
    hairRight: await mask(conf.hairRight, W, H, conf.shapeDx),
    bow: Buffer.alloc(N),
  };
  const skinMask = Buffer.alloc(N);
  for (let y = conf.skin.top; y < conf.skin.top + conf.skin.height; y++)
    for (let x = conf.skin.left; x < conf.skin.left + conf.skin.width; x++) {
      const i = y * W + x;
      if (
        maskPixels[i * 4] > maskPixels[i * 4 + 2] + 25 &&
        maskPixels[i * 4 + 1] > maskPixels[i * 4 + 2] + 8
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
        Math.max(
          maskPixels[i * 4],
          maskPixels[i * 4 + 1],
          maskPixels[i * 4 + 2],
        ) > 150
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
        if (parts[ids[owner[i]]][i * 4 + c] !== original[i * 4 + c]) mismatch++;
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
            patch[i + c] = Math.round(eye[i + c] * (1 - t) + patch[i + c] * t);
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
  const prepared = await preparePendants(name, root, source(conf.source));
  fs.writeFileSync(
    path.join(WORK, name + '-report.json'),
    JSON.stringify(
      {
        source: file(conf.source),
        ownedSourcePixels: owned,
        detachedTipPixels,
        reconstructionMismatches: mismatch,
        layers: prepared.layers.length,
        blink: manifest.rig.blink,
        mouth: manifest.rig.mouth,
      },
      null,
      2,
    ),
  );
  console.log(
    `${name}: base source ownership verified; cape and pendants prepared`,
  );
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(WORK, { recursive: true });
  const selected = process.argv.slice(2);
  for (const [name, c] of Object.entries(configs))
    if (!selected.length || selected.includes(name)) await prepare(name, c);
  if (!selected.length || selected.includes('idle')) {
    for (const [name, id] of [
      ['half-eye', '02_01'],
      ['talk', '02_00'],
    ])
      await sharp(source(id))
        .resize({ height: 2400 })
        .webp({ quality: 92, alphaQuality: 100, effort: 4 })
        .toFile(path.join(OUT, name + '.webp'));
  }
  fs.writeFileSync(
    path.join(WORK, 'cape-configs.json'),
    JSON.stringify(configs, null, 2),
  );
}
module.exports = { configs, prepare };
if (require.main === module)
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
