const sharp = require('/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('fs');
const path = require('path');
const SRC = '/Users/1gnat4y/Library/CloudStorage/OneDrive-个人/魔法使之夜/Alice/立绘';
const POSES = {
  thinking: {
    source: 'ARI_A_08_03_03-HD.png', width: 1370, height: 5392,
    headBox: {left: 270, top: 0, width: 870, height: 1100},
    handBox: {left: 520, top: 810, width: 250, height: 500},
    backingBox: {left: 320, top: 770, width: 730, height: 550},
    eyeBox: {left: 455, top: 525, width: 335, height: 130},
    mouthBox: {left: 620, top: 720, width: 90, height: 60},
    shapes: {
      head: 'M0 0 H1370 V820 H788 L787 846 L724 858 L703 835 L677 820 H0 Z',
      hairLeft: 'M368 494 L491 505 L564 620 L622 747 L671 798 L670 852 L626 867 L592 918 L560 944 L552 969 L530 958 L520 984 L505 1006 L500 1078 L480 1064 L448 1048 L415 1009 L376 948 Z',
      hairRight: 'M784 522 L919 541 L1022 602 L1022 739 L1007 813 L984 856 L975 845 L958 889 L939 914 L936 879 L916 925 L903 943 L910 905 L883 950 L867 961 L873 942 L835 980 L815 989 L832 962 L800 986 L823 950 L793 952 L798 913 L788 855 Z',
      bow: 'M809 559 Q899 468 952 450 Q987 424 1017 449 Q1040 449 1050 474 L1085 541 L1094 578 L1084 630 L1046 680 L1015 699 L1001 662 L997 583 L981 579 Q964 634 940 653 Q867 625 828 592 Z',
      handFront: 'M599 840 Q617 830 639 828 Q660 814 680 820 L705 853 L730 886 Q749 909 739 950 L714 1044 L727 1061 L715 1082 L735 1095 L728 1113 L742 1124 L742 1140 L754 1150 Q699 1162 670 1225 L650 1261 L625 1297 L615 1277 L610 1268 L611 1236 L623 1229 Q605 1171 581 1112 Q560 1085 560 1049 L559 982 L546 971 L538 955 L546 931 L560 915 L567 897 L592 885 L620 876 L631 866 L608 866 Z',
      eyes: 'M461 586 Q498 600 548 605 L562 622 Q522 645 483 639 L464 613 Z M686 551 Q730 558 782 536 L781 572 Q743 598 688 592 L675 581 Z',
      mouth: 'M622 722 H708 V778 H622 Z',
    },
    rig: {
      headPivot: {x: 652, y: 1224}, bodyPivot: {x: 700, y: 2230},
      bodyRigidUntil: 1320, bodyFixedFrom: 3600,
      hairLeft: {pin: 920, tip: 1075}, hairRight: {pin: 890, tip: 990},
      bowPivot: {x: 1001, y: 471},
      arms: [{spring: 'armBack', cx: 179, cy: 2260, rx: 168, ry: 490, ex: 261, ey: 1460}],
      headGain: 0.25, nodGain: 0, blink: false, mouth: false,
    },
  },
  shy: {
    source: 'ARI_A_08_19_01-HD.png', width: 1591, height: 4845,
    headBox: {left: 0, top: 0, width: 780, height: 1080},
    backingBox: {left: 65, top: 760, width: 670, height: 345},
    eyeBox: {left: 140, top: 540, width: 340, height: 120},
    mouthBox: {left: 277, top: 744, width: 67, height: 63},
    shapes: {
      head: 'M0 0 H780 V780 H480 V840 Q419 875 366 837 Q333 849 306 834 L277 810 L235 780 H0 Z',
      hairLeft: 'M21 498 L137 503 L169 636 L201 709 L238 767 L281 798 L286 837 L270 865 L253 891 L245 858 L224 897 L218 924 L202 901 L197 956 L186 941 L188 983 L166 963 L171 1012 L145 1016 L116 1028 L88 1000 L61 919 Z',
      hairRight: 'M484 546 L592 560 L708 676 L699 747 L678 800 L650 819 L631 855 L628 815 L607 879 L596 862 L574 913 L558 920 L548 947 L526 970 L520 978 L490 991 L461 1007 L420 1019 L443 1003 L463 968 L477 913 L480 850 Z',
      bow: 'M463 573 Q514 524 560 501 Q593 477 620 481 Q651 479 666 512 L683 557 L722 597 L734 643 L714 684 L675 717 L646 733 L632 674 L628 622 L613 615 L594 674 L574 698 Q504 666 479 616 Z',
      eyes: 'M146 550 Q169 548 187 565 L211 591 L221 619 L211 647 Q182 651 167 633 L154 600 Z M352 572 Q409 549 469 560 L471 618 Q448 647 406 644 L377 635 Z',
      mouth: 'M279 746 H342 V805 H279 Z',
    },
    rig: {
      headPivot: {x: 411, y: 847}, bodyPivot: {x: 824, y: 2200},
      bodyRigidUntil: 1250, bodyFixedFrom: 3210,
      hairLeft: {pin: 885, tip: 1035}, hairRight: {pin: 899, tip: 1022},
      bowPivot: {x: 630, y: 512},
      arms: [
        {spring: 'armFront', cx: 1085, cy: 1260, rx: 235, ry: 375, ex: 1022, ey: 960},
        {spring: 'armBack', cx: 219, cy: 1170, rx: 145, ry: 300, ex: 209, ey: 980},
      ],
      headGain: 0.68, nodGain: 0.35, blink: false, mouth: false,
      portraitCenterX: 675, portraitWidth: 1400,
    },
  },
};

async function polygonMask(p, w, h) {
  const rgba = await sharp(Buffer.from(`<svg width="${w}" height="${h}"><path d="${p}" fill="white"/></svg>`)).ensureAlpha().raw().toBuffer();
  return Uint8Array.from({length: w * h}, (_, i) => rgba[i * 4 + 3] > 127 ? 255 : 0);
}

function copyPixel(src, si, dst, di = si) {
  for (let c = 0; c < 4; c++) dst[di * 4 + c] = src[si * 4 + c];
}

async function prepare(name, conf) {
  const W = conf.width, H = conf.height, size = W * H;
  const out = `public/models/alice/layers/${name}`;
  fs.mkdirSync(out, {recursive: true}); fs.mkdirSync('work/alice', {recursive: true});
  const raw = await sharp(path.join(SRC, conf.source)).ensureAlpha().raw().toBuffer();
  const masks = {};
  for (const [id, shape] of Object.entries(conf.shapes)) masks[id] = await polygonMask(shape, W, H);
  // Capture thin antialiased strand/glove outlines just outside the traced guide.
  for (const id of ['hairLeft', 'hairRight', ...(conf.handBox ? ['handFront'] : [])]) {
    const expanded = await sharp(masks[id], {raw:{width:W,height:H,channels:1}}).dilate(5).extractChannel(0).raw().toBuffer();
    for (let i = 0; i < size; i++) {
      if (expanded[i] > 127 && Math.max(raw[i*4],raw[i*4+1],raw[i*4+2]) < 115) masks[id][i] = 255;
    }
  }
  // The painted neckline is curved. Keep all skin pixels with the rigid head.
  const skinRange = name === 'thinking' ? [640, 810, 780, 875] : [270, 500, 770, 875];
  for (let y = skinRange[2]; y < skinRange[3]; y++) for (let x = skinRange[0]; x < skinRange[1]; x++) {
    const i = y*W+x;
    if (raw[i*4] > raw[i*4+2]+25 && raw[i*4+1] > raw[i*4+2]+8) masks.head[i] = 255;
  }
  for (const id of ['hairLeft', 'hairRight']) for (let i = 0; i < size; i++) {
    if (Math.max(raw[i * 4], raw[i * 4 + 1], raw[i * 4 + 2]) > 128) masks[id][i] = 0;
  }
  // A disjoint source-pixel ownership map prevents a second stationary head underneath.
  const owner = new Uint8Array(size);
  const ids = ['body', 'head', 'hairLeft', 'hairRight', 'bow', 'eyesOpen', 'mouthClosed'];
  if (conf.handBox) ids.push('handFront');
  const parts = Object.fromEntries(ids.map(id => [id, Buffer.alloc(raw.length)]));
  for (let i = 0; i < size; i++) {
    if (!raw[i * 4 + 3]) continue;
    let id = 'body';
    if (masks.head[i]) id = 'head';
    if (masks.hairLeft[i]) id = 'hairLeft';
    if (masks.hairRight[i]) id = 'hairRight';
    if (masks.bow[i]) id = 'bow';
    if (id === 'head' && masks.eyes[i]) id = 'eyesOpen';
    if (id === 'head' && masks.mouth[i]) id = 'mouthClosed';
    if (masks.handFront?.[i]) id = 'handFront';
    owner[i] = ids.indexOf(id);
    copyPixel(raw, i, parts[id]);
  }
  // The neutral disjoint composite must reconstruct every source pixel exactly.
  let mismatches = 0;
  for (let i = 0; i < size; i++) if (raw[i * 4 + 3]) {
    const part = parts[ids[owner[i]]];
    for (let c = 0; c < 4; c++) if (raw[i * 4 + c] !== part[i * 4 + c]) mismatches++;
  }
  if (mismatches) throw new Error(`${name}: ${mismatches} source ownership mismatches`);

  // Gutters use nearby source pixels only, inside the original opaque silhouette.
  // They remain covered at rest and protect small head/hair/hand excursions.
  const backing = Buffer.alloc(raw.length);
  const box = conf.backingBox;
  for (let y = box.top; y < box.top + box.height; y++) for (let x = box.left; x < box.left + box.width; x++) {
    const i = y * W + x;
    if (!owner[i] || raw[i * 4 + 3] < 254) continue;
    let nearest = -1;
    for (let d = 1; d <= 18 && nearest < 0; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
      const j = (y + dy) * W + x + dx;
      if (parts.body[j * 4 + 3] > 250) { nearest = j; break; }
    }
    if (nearest >= 0) copyPixel(parts.body, nearest, backing, i);
  }
  parts.backing = backing;
  const filledHead = Buffer.from(parts.head);
  const hb = conf.headBox;
  for (let y = 475; y < Math.min(950, hb.height); y++) for (let x = hb.left; x < hb.left + hb.width; x++) {
    const i = y * W + x;
    if (filledHead[i * 4 + 3] || raw[i * 4 + 3] < 254 || ![2, 3, 4, 5, 6].includes(owner[i])) continue;
    let nearest = -1;
    for (let d = 1; d <= 18 && nearest < 0; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
      const j = (y + dy) * W + x + dx;
      if (parts.head[j * 4 + 3] > 250) { nearest = j; break; }
    }
    if (nearest >= 0) copyPixel(parts.head, nearest, filledHead, i);
  }
  parts.head = filledHead;
  parts.eyesHalf = Buffer.from(parts.eyesOpen);
  parts.eyesClosed = Buffer.from(parts.eyesOpen);
  parts.mouth = Buffer.from(parts.mouthClosed);

  // The closed-eye edit is restricted to eye interiors. Omit it until inspected.
  const closedFile = `work/alice/${name}-closed-eyes-native.png`;
  if (name === 'shy' && fs.existsSync(closedFile)) {
    const closed = await sharp(closedFile).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    const eb = conf.eyeBox;
    if (closed.info.width !== eb.width || closed.info.height !== eb.height) throw new Error('Shy eye patch dimensions must match eyeBox');
    for (let y = 0; y < eb.height; y++) for (let x = 0; x < eb.width; x++) {
      const i = (y + eb.top) * W + x + eb.left, j = y * eb.width + x;
      if (parts.eyesOpen[i * 4 + 3]) {
        let edgeDistance = 6;
        for (let d = 1; d < 6; d++) {
          if ([-d,d,-d*W,d*W].some(offset => !parts.eyesOpen[(i+offset)*4+3])) { edgeDistance=d; break; }
        }
        const t = (edgeDistance-1)/5;
        for (let c = 0; c < 3; c++) parts.eyesClosed[i * 4 + c] = Math.round(closed.data[j * 4 + c]*t + parts.eyesOpen[i*4+c]*(1-t));
      }
    }
    conf.rig.blink = true;
    // No same-pose half-eye source exists. Use a short closed hold, without double irises.
    parts.eyesHalf = Buffer.from(parts.eyesClosed);
  }
  const manifest = {width: W, height: H, source: conf.source, layers: [], rig: conf.rig};
  for (const [id, data] of Object.entries(parts)) {
    const crop = id === 'body' ? {left: 0, top: 0, width: W, height: H}
      : id === 'backing' ? conf.backingBox : id.startsWith('eyes') ? conf.eyeBox
      : id.startsWith('mouth') ? conf.mouthBox : id === 'handFront' ? conf.handBox : conf.headBox;
    const png = await sharp(data, {raw: {width: W, height: H, channels: 4}}).extract(crop).resize({width: Math.round(crop.width * .75)}).png().toBuffer();
    fs.writeFileSync(`${out}/${id}.png`, png);
    let runtime = sharp(png);
    if (id === 'body') runtime = runtime.resize({height:3600,withoutEnlargement:true});
    await runtime.webp({quality: 95, alphaQuality: 100, effort: 6}).toFile(`${out}/${id}.webp`);
    manifest.layers.push({id, file: `${id}.png`, runtimeFile: `${id}.webp`, ...crop});
  }
  fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  // Review all join boundaries at source resolution against the original.
  const reviewBox = {left: conf.headBox.left, top: 0, width: conf.headBox.width, height: name === 'thinking' ? 1350 : 1150};
  const order = ['backing', 'body', 'head', 'hairLeft', 'hairRight', 'eyesOpen', 'mouthClosed', 'bow', 'handFront'].filter(id => parts[id]);
  const composite = await sharp({create: {width: W, height: H, channels: 4, background: '#00000000'}}).composite(await Promise.all(order.map(async id => ({input: await sharp(parts[id], {raw: {width: W, height: H, channels: 4}}).png().toBuffer()})))).png().toBuffer();
  await sharp(composite).extract(reviewBox).png().toFile(`work/alice/${name}-assembled.png`);
  const colors = ['#f55', '#5f5', '#5bf', '#ff5', '#f5f', '#5ff', '#fff'];
  const annotation = `<svg width="${reviewBox.width}" height="${reviewBox.height}"><g transform="translate(${-reviewBox.left} 0)">${Object.values(conf.shapes).map((p, i) => `<path d="${p}" fill="${colors[i]}" fill-opacity=".08" stroke="${colors[i]}" stroke-width="2"/>`).join('')}</g></svg>`;
  await sharp(path.join(SRC, conf.source)).extract(reviewBox).composite([{input: Buffer.from(annotation)}]).png().toFile(`work/alice/${name}-mask-review.png`);
  const closedFull = await sharp(composite).composite([{input: await sharp(parts.eyesClosed, {raw:{width:W,height:H,channels:4}}).png().toBuffer()}]).png().toBuffer();
  const closedComposite = await sharp(closedFull).extract({left: conf.eyeBox.left - 30, top: conf.eyeBox.top - 30, width: conf.eyeBox.width + 60, height: conf.eyeBox.height + 80}).png().toBuffer();
  fs.writeFileSync(`work/alice/${name}-closed-eye-review.png`, closedComposite);
  console.log(`${name}: source ownership exact; ${manifest.layers.length} layers; blink=${conf.rig.blink}; output ${out}`);
}

module.exports = { POSES };
if (require.main === module) (async () => { for (const [name, conf] of Object.entries(POSES)) await prepare(name, conf); })().catch(error => {console.error(error); process.exitCode = 1;});
