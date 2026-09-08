/** Extract the original cape cords, pom-poms and their soft cast shadows.
 * Hidden coat pixels are interpolated from adjacent pixels on the same row.
 * The residual texture reconstructs the original at rest, without a baked shadow.
 */
/* oxlint-disable typescript/no-require-imports -- Offline CommonJS asset preparation. */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(
  process.env.ALICE_SHARP_MODULE ||
    '/Users/1gnat4y/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp',
);
const REVISION = 'cape-pendants-20260908-3';
const configs = {
  idle: {
    cordShadow: 17,
    frontSeam: [
      [1280, 829],
      [1285, 831],
      [1290, 833],
      [1300, 834],
      [1310, 833],
      [1320, 831],
      [1330, 825],
      [1340, 820],
      [1346, 809],
    ],
    box: [726, 1024, 229, 389],
    balls: [
      {
        center: [794, 1305],
        radius: [46, 49],
        pivot: [854, 1026],
        cord: 'M854 1026 Q835 1125 807 1270',
        width: 18,
      },
      {
        center: [872, 1309],
        radius: [46, 49],
        pivot: [864, 1026],
        cord: 'M864 1026 Q865 1130 870 1273',
        width: 21,
      },
    ],
  },
  relaxed: {
    cordShadow: 12,
    frontSeam: [
      [1200, 883],
      [1202, 887],
      [1204, 889],
      [1206, 891],
      [1208, 893],
      [1210, 895],
      [1212, 897],
      [1214, 899],
      [1216, 901],
      [1221, 902],
      [1226, 904],
      [1231, 906],
      [1251, 906],
      [1256, 905],
      [1261, 904],
      [1266, 902],
      [1271, 900],
    ],
    box: [786, 1045, 244, 308],
    balls: [
      {
        center: [864, 1246],
        radius: [46, 49],
        pivot: [892, 1047],
        cord: 'M892 1047 Q886 1135 876 1201',
        width: 19,
      },
      {
        center: [940, 1238],
        radius: [46, 49],
        pivot: [903, 1047],
        cord: 'M903 1047 Q918 1120 935 1194',
        width: 19,
      },
    ],
  },
  side: {
    frontSeam: [
      [1256, 910],
      [1258, 916],
      [1260, 919],
      [1262, 922],
      [1264, 925],
      [1266, 927],
      [1270, 930],
      [1275, 932],
      [1280, 934],
      [1285, 935],
      [1305, 935],
      [1315, 934],
      [1320, 932],
      [1325, 930],
      [1330, 927],
      [1335, 923],
      [1340, 919],
    ],
    box: [740, 1034, 280, 371],
    balls: [
      {
        center: [895, 1307],
        radius: [47, 50],
        pivot: [758, 1040],
        cord: 'M758 1040 Q819 1160 874 1266',
        width: 16,
      },
      {
        center: [938, 1281],
        radius: [46, 47],
        pivot: [781, 1038],
        cord: 'M781 1038 Q850 1155 927 1245',
        width: 16,
      },
    ],
  },
  profile: {
    box: [1160, 1047, 300, 387],
    balls: [
      {
        center: [1239, 1333],
        radius: [46, 49],
        pivot: [1320, 1049],
        cord: 'M1320 1049 C1325 1110 1320 1175 1305 1200 C1298 1230 1282 1275 1262 1295',
        width: 18,
      },
      {
        center: [1356, 1290],
        radius: [45, 47],
        pivot: [1347, 1049],
        cord: 'M1347 1049 C1386 1104 1391 1180 1370 1250',
        width: 18,
      },
    ],
  },
  shy: {
    cordShadow: 19,
    frontSeam: [
      [1235, 571],
      [1240, 575],
      [1245, 578],
      [1250, 579],
      [1265, 579],
      [1270, 580],
      [1275, 583],
      [1280, 586],
      [1285, 579],
      [1290, 577],
      [1295, 572],
    ],
    box: [468, 987, 245, 376],
    balls: [
      {
        center: [545, 1265],
        radius: [45, 47],
        pivot: [586, 989],
        cord: 'M586 989 C576 1050 560 1150 551 1220',
        width: 19,
      },
      {
        center: [621, 1264],
        radius: [45, 49],
        pivot: [598, 989],
        cord: 'M598 989 C598 1050 606 1150 611 1220',
        width: 19,
      },
    ],
  },
  leaning: {
    box: [388, 1189, 178, 170],
    balls: [
      {
        center: [456, 1264],
        radius: [44, 45],
        pivot: [503, 966],
        cord: 'M454 1192 L449 1223',
        width: 10,
        // The cuff constrains this ball; keep its travel within the hidden fur.
        gain: 0.12,
        clip: [
          [380, 1188],
          [461, 1188],
          [453, 1217],
          [462, 1236],
          [478, 1247],
          [471, 1260],
          [485, 1281],
          [500, 1305],
          [520, 1324],
          [558, 1370],
          [380, 1370],
        ],
      },
    ],
  },
};
configs['side-folded'] = configs.side;
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
function insidePolygon(points, x, y) {
  let inside = false;
  for (let a = 0, b = points.length - 1; a < points.length; b = a++)
    if (
      points[a][1] > y !== points[b][1] > y &&
      x <
        ((points[b][0] - points[a][0]) * (y - points[a][1])) /
          (points[b][1] - points[a][1]) +
          points[a][0]
    )
      inside = !inside;
  return inside;
}
async function read(file) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function preparePendants(pose, root, sourceFile) {
  const conf = configs[pose];
  if (!conf) return;
  const [left, top, width, height] = conf.box;
  const box = { left, top, width, height };
  const original = await sharp(sourceFile)
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer();
  const body = await read(path.join(root, 'body.png'));
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, 'manifest.json')),
  );
  // Always regenerate from the source, including pixels removed by an older
  // matte. Otherwise a narrower second extraction leaves permanent coat scars.
  for (let y = 0; y < height; y++)
    original.copy(
      body.data,
      ((top + y) * body.info.width + left) * 4,
      y * width * 4,
      (y + 1) * width * 4,
    );
  const masks = [],
    supports = [],
    cordRows = [],
    outlines = [];
  const ink = (i) => Math.max(...original.subarray(i * 4, i * 4 + 3)) < 22;
  for (const ball of conf.balls) {
    const [cx, cy] = ball.center,
      [rx, ry] = ball.radius;
    // Locate the outer ink edge along radial samples. Keeping a complete
    // silhouette prevents one ball's rim from leaking into the other layer.
    const samples = 180,
      radii = [];
    const valueAt = (x, y) => {
      x = Math.max(0, Math.min(width - 1, Math.round(x - left)));
      y = Math.max(0, Math.min(height - 1, Math.round(y - top)));
      const i = (y * width + x) * 4;
      return (original[i] + original[i + 1] + original[i + 2]) / 3;
    };
    for (let n = 0; n < samples; n++) {
      const angle = (n * Math.PI * 2) / samples;
      const dx = Math.cos(angle),
        dy = Math.sin(angle);
      const nominal = 1 / Math.hypot(dx / rx, dy / ry);
      let best = nominal * 0.94,
        score = -Infinity;
      for (let r = nominal * 0.7; r <= nominal * 1.16; r += 0.5) {
        const inner = valueAt(cx + dx * (r - 1.5), cy + dy * (r - 1.5));
        const outer = valueAt(cx + dx * (r + 1.5), cy + dy * (r + 1.5));
        const edge = outer - inner - Math.abs(r / nominal - 0.94) * 14;
        if (edge > score) {
          score = edge;
          best = r;
        }
      }
      radii.push(best);
    }
    if (outlines.length && conf.frontSeam) {
      const visible = [...radii],
        front = conf.balls[0];
      for (let n = 0; n < samples; n++) {
        const angle = (n * Math.PI * 2) / samples,
          dx = Math.cos(angle),
          dy = Math.sin(angle);
        const r = radii[n];
        if (
          dx < 0 &&
          Math.hypot(
            (cx + dx * r - front.center[0]) / (front.radius[0] + 8),
            (cy + dy * r - front.center[1]) / (front.radius[1] + 8),
          ) < 1.1
        )
          radii[n] = visible[(samples / 2 - n + samples) % samples];
      }
    }
    const silhouette = new Float32Array(width * height);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const dx = left + x - cx,
          dy = top + y - cy;
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;
        const n = (angle / (Math.PI * 2)) * samples,
          index = Math.floor(n);
        const radius =
          radii[index] * (1 - n + index) +
          radii[(index + 1) % samples] * (n - index);
        silhouette[y * width + x] =
          pose === 'leaning' && dx >= -15
            ? Math.min(rx, ry) * (1 - Math.hypot(dx / rx, dy / ry))
            : radius - Math.hypot(dx, dy);
      }
    if (!outlines.length && conf.frontSeam) {
      // Hand-registered overlap boundary: the other ball is too dark here for
      // a contrast-only detector to distinguish its outline from the front rim.
      const seam = conf.frontSeam;
      for (let y = 0; y < height; y++) {
        const sy = y + top;
        const index = seam.findIndex(
          (p, i) => i > 0 && sy >= seam[i - 1][0] && sy <= p[0],
        );
        if (index < 0) continue;
        const [ay, ax] = seam[index - 1],
          [by, bx] = seam[index];
        const boundary = ax + ((bx - ax) * (sy - ay)) / (by - ay);
        for (let x = 0; x < width; x++)
          if (left + x > cx) silhouette[y * width + x] = boundary - left - x;
      }
    }
    outlines.push(silhouette);
    const svg = Buffer.from(
      `<svg width="${width}" height="${height}"><g transform="translate(${-left} ${-top})"><path d="${ball.cord}" fill="none" stroke="white" stroke-width="${ball.width}"/></g></svg>`,
    );
    const guide = await sharp(svg)
      .ensureAlpha()
      .extractChannel(3)
      .raw()
      .toBuffer();
    const mask = new Uint8Array(width * height);
    const support = new Float32Array(width * height);
    const rows = [];
    for (let y = 0; y < height; y++) {
      let cordLeft = width,
        cordRight = -1;
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!ink(i)) continue;
        if (guide[i] > 127) {
          cordLeft = Math.min(cordLeft, x);
          cordRight = Math.max(cordRight, x);
        }
      }
      rows.push(cordRight >= cordLeft ? [cordLeft, cordRight] : null);
      const t = Math.max(
        0,
        Math.min(1, (top + y - ball.pivot[1]) / (cy - ry - ball.pivot[1])),
      );
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const inBall = silhouette[i] >= 0.7;
        const inCord = x >= cordLeft && x <= cordRight && guide[i] > 0;
        if (inBall || inCord) mask[i] = 255;
        // Keep the entire antialiased cord and its offset soft shadow together.
        // The shadow's footprint belongs to this cord, never the nearest ball.
        if (cordRight >= cordLeft) {
          const offset = (conf.cordShadow ?? 0) * smooth(Math.min(1, t * 2));
          support[i] = Math.max(
            support[i],
            smooth((x - cordLeft + 3) / 3) *
              smooth((cordRight + offset + 5 - x) / 4),
          );
        }
        support[i] = Math.max(support[i], smooth((silhouette[i] + 3) / 2));
        // Limit the soft shadow to the sphere's immediate surroundings. A wide
        // residual used to pick up garment seams and unrelated dark folds.
        const d = Math.hypot(
          (left + x - cx - 5) / (rx + 17),
          (top + y - cy - 17) / (ry + 23),
        );
        support[i] = Math.max(
          support[i],
          smooth((1 - d) / 0.25),
          mask[i] / 255,
        );
        if (pose === 'shy' && !mask[i])
          support[i] *= smooth((left + x - 495) / 9);
      }
    }
    masks.push(mask);
    supports.push(support);
    cordRows.push(rows);
  }
  const repair = new Float32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let amount = Math.max(...supports.map((support) => support[i]));
      if (pose === 'leaning') {
        const points = conf.balls[0].clip;
        if (!insidePolygon(points, left + x, top + y)) amount = 0;
        else if (!masks.some((mask) => mask[i] > 127)) {
          let distance = Infinity;
          for (let a = 0, b = points.length - 1; a < points.length; b = a++) {
            const [ax, ay] = points[a],
              [bx, by] = points[b];
            const dx = bx - ax,
              dy = by - ay;
            const t = Math.max(
              0,
              Math.min(
                1,
                ((left + x - ax) * dx + (top + y - ay) * dy) /
                  (dx * dx + dy * dy),
              ),
            );
            distance = Math.min(
              distance,
              Math.hypot(left + x - ax - t * dx, top + y - ay - t * dy),
            );
          }
          amount *= smooth(distance / 16);
        }
      }
      repair[i] = amount;
    }
  const textures = conf.balls.map(() => Buffer.alloc(original.length));
  const clean = Buffer.from(original);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x,
        j = i * 4;
      let a = repair[i];
      if (!a) continue;
      // Interpolate each connected ribbon separately: preserve the coat between
      // the cords and sample beside this object, not across the whole chest.
      let start = x,
        end = x;
      while (start > 0 && repair[y * width + start] > 0.001) start--;
      while (end < width - 1 && repair[y * width + end] > 0.001) end++;
      start = Math.max(0, start - 2);
      end = Math.min(width - 1, end + 2);
      const isCore = masks.some((mask) => mask[i] > 127);
      const fillColor = [];
      for (let c = 0; c < 3; c++) {
        const l = original[(y * width + start) * 4 + c],
          r = original[(y * width + end) * 4 + c];
        fillColor[c] =
          pose === 'leaning'
            ? l
            : (l * (end - x)) / (end - start) +
              (r * (x - start)) / (end - start);
      }
      // Only dark residuals outside the object are cast shadows. Preserve
      // unrelated folds/highlights instead of moving rectangular coat patches.
      if (
        !isCore &&
        original[j] + original[j + 1] + original[j + 2] >=
          fillColor.reduce((n, v) => n + v, 0) - 6
      )
        a = 0;
      if (!a) continue;
      for (let c = 0; c < 3; c++) {
        clean[j + c] = Math.round(original[j + c] * (1 - a) + fillColor[c] * a);
        body.data[((top + y) * body.info.width + left + x) * 4 + c] =
          clean[j + c];
      }
      let owner = 0;
      if (conf.balls.length > 1) {
        const distance = (k) => {
          const ball = conf.balls[k],
            row = cordRows[k][y];
          return row && top + y < ball.center[1] - ball.radius[1]
            ? Math.abs(x - (row[0] + row[1]) / 2 - (conf.cordShadow ?? 0) / 2)
            : Math.hypot(left + x - ball.center[0], top + y - ball.center[1]);
        };
        owner =
          outlines[0][i] >= 0
            ? 0
            : outlines[1][i] >= -2
              ? 1
              : masks[0][i] > 127
                ? 0
                : masks[1][i] > 127
                  ? 1
                  : !supports[0][i]
                    ? 1
                    : !supports[1][i]
                      ? 0
                      : distance(0) < distance(1)
                        ? 0
                        : 1;
      }
      const core = masks[owner][i] > 127;
      let opacity = core ? 1 : 0;
      if (!core)
        for (let c = 0; c < 3; c++) {
          const o = original[j + c],
            b = clean[j + c];
          opacity = Math.max(
            opacity,
            o < b ? (b - o) / Math.max(1, b) : (o - b) / Math.max(1, 255 - b),
          );
        }
      const alpha = Math.min(255, Math.ceil(opacity * 255));
      if (alpha) {
        if (
          !core &&
          conf.balls.length === 2 &&
          outlines.every((outline) => outline[i] < -8) &&
          conf.balls.every(
            (ball) => top + y >= ball.center[1] - ball.radius[1] - 4,
          )
        ) {
          const distance = (k) =>
            Math.hypot(
              left + x - conf.balls[k].center[0],
              top + y - conf.balls[k].center[1],
            );
          const weight = smooth(0.5 + (distance(1) - distance(0)) / 36);
          const alphas = [weight, 1 - weight].map((w) =>
            Math.ceil((1 - Math.pow(1 - alpha / 255, w)) * 255),
          );
          const combined =
            (1 - (1 - alphas[0] / 255) * (1 - alphas[1] / 255)) * 255;
          for (let k = 0; k < 2; k++)
            if (alphas[k]) {
              for (let c = 0; c < 3; c++)
                textures[k][j + c] = Math.max(
                  0,
                  Math.min(
                    255,
                    Math.round(
                      clean[j + c] +
                        ((original[j + c] - clean[j + c]) * 255) / combined,
                    ),
                  ),
                );
              textures[k][j + 3] = alphas[k];
            }
        } else {
          for (let c = 0; c < 3; c++)
            textures[owner][j + c] = Math.max(
              0,
              Math.min(
                255,
                Math.round(
                  clean[j + c] +
                    ((original[j + c] - clean[j + c]) * 255) / alpha,
                ),
              ),
            );
          textures[owner][j + 3] = alpha;
        }
      }
    }
  }
  if (textures.length === 2 && conf.frontSeam) {
    const rear = conf.balls[1],
      visible = Buffer.from(textures[1]);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * width + x,
          j = i * 4;
        if (
          outlines[0][i] < 0.7 ||
          outlines[1][i] < -2 ||
          left + x >= rear.center[0]
        )
          continue;
        const sx = Math.round(rear.center[0] * 2 - left - x) - left;
        if (sx < 0 || sx >= width) continue;
        const sj = (y * width + sx) * 4;
        // Mirror the rear sphere's OWN matte too, so no rectangular coat patch
        // is introduced by filling the portion hidden behind the front sphere.
        for (let c = 0; c < 4; c++) textures[1][j + c] = visible[sj + c];
        const background = [0, 1, 2].map(
          (c) =>
            clean[j + c] * (1 - textures[1][j + 3] / 255) +
            (textures[1][j + c] * textures[1][j + 3]) / 255,
        );
        let alpha = textures[0][j + 3] / 255;
        for (let c = 0; c < 3; c++) {
          const o = original[j + c],
            b = background[c];
          alpha = Math.max(
            alpha,
            o < b ? (b - o) / Math.max(1, b) : (o - b) / Math.max(1, 255 - b),
          );
        }
        const a = Math.min(255, Math.ceil(alpha * 255));
        if (!a) continue;
        for (let c = 0; c < 3; c++)
          textures[0][j + c] = Math.max(
            0,
            Math.min(
              255,
              Math.round(
                background[c] + ((original[j + c] - background[c]) * 255) / a,
              ),
            ),
          );
        textures[0][j + 3] = a;
      }
  }
  // Complete the portion behind the cuff from the sphere's visible side.
  // The stationary occlusion clip hides these pixels at rest, but they prevent
  // the moving cut edge from opening a pale seam against the sleeve.
  if (pose === 'leaning') {
    const ball = conf.balls[0];
    for (let y = 0; y < height; y++) {
      let visibleEnd = -1;
      for (let x = 0; x < width; x++)
        if (insidePolygon(ball.clip, left + x, top + y)) visibleEnd = x;
      for (let x = 0; x < width; x++) {
        if (insidePolygon(ball.clip, left + x, top + y)) continue;
        if (
          Math.hypot(
            (left + x - ball.center[0]) / ball.radius[0],
            (top + y - ball.center[1]) / ball.radius[1],
          ) > 1
        )
          continue;
        // Near the top, even the mirrored point can fall inside the cuff.
        // Clamp it to visible fur so the hidden fill cannot carry sleeve pixels.
        const sx = Math.min(
          Math.round(ball.center[0] * 2 - left - x) - left,
          visibleEnd - 3,
        );
        if (sx < 0 || sx >= width) continue;
        const j = (y * width + x) * 4;
        for (let c = 0; c < 3; c++)
          textures[0][j + c] = original[(y * width + sx) * 4 + c];
        textures[0][j + 3] = 255;
      }
    }
  }
  const png = await sharp(body.data, {
    raw: { width: body.info.width, height: body.info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(root, 'body.png'), png);
  await sharp(png)
    .resize({ height: 3600, withoutEnlargement: true })
    .webp({ quality: 95, alphaQuality: 100, effort: 4 })
    .toFile(path.join(root, 'body.webp'));
  // Draw rear ball first; the original left ball is in front where they overlap.
  manifest.rig.pendants = [];
  manifest.layers = manifest.layers.filter(
    (l) => !['pomLeft', 'pomRight'].includes(l.id),
  );
  for (let k = conf.balls.length - 1; k >= 0; k--) {
    const ball = conf.balls[k],
      id = k ? 'pomRight' : 'pomLeft';
    const data = await sharp(textures[k], {
      raw: { width, height, channels: 4 },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(path.join(root, id + '.png'), data);
    await sharp(data)
      .webp({ lossless: true, effort: 4 })
      .toFile(path.join(root, id + '.webp'));
    manifest.layers.push({
      id,
      file: id + '.png',
      runtimeFile: id + '.webp',
      ...box,
    });
    manifest.rig.pendants.push({
      layer: id,
      pivot: { x: ball.pivot[0], y: ball.pivot[1] },
      gain: ball.gain ?? 1,
      ...(ball.clip ? { clip: ball.clip.map(([x, y]) => ({ x, y })) } : {}),
    });
  }
  manifest.pendantRevision = REVISION;
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  const output = path.resolve('work/alice/cape-pompoms');
  fs.mkdirSync(output, { recursive: true });
  await sharp(clean, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(path.join(output, pose + '-clean-coat.png'));
  console.log(
    `${pose}: ${textures.length} independent pendants, coat/shadow removed`,
  );
  return manifest;
}
module.exports = { preparePendants, configs, REVISION, insidePolygon };
if (require.main === module)
  (async () => {
    for (const pose of process.argv.slice(2).length
      ? process.argv.slice(2)
      : Object.keys(configs)) {
      const root = path.resolve(
        'public/models/alice-cape/layers',
        pose === 'idle' ? '' : pose,
      );
      const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
      await preparePendants(
        pose,
        root,
        path.join(
          process.env.ALICE_SOURCE_DIR || '/Users/1gnat4y/Desktop/立绘/4',
          m.source,
        ),
      );
    }
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
