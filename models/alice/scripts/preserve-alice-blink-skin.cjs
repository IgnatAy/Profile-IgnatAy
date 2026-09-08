/** Keep original blush outside the changing eye silhouettes. Offline only. */
function preserveBlinkSkin(base, variant, { width, height }) {
  const skin = (data, i) => data[i] > 170 && data[i + 1] > 120 &&
    data[i] - data[i + 1] > 5 && data[i + 1] - data[i + 2] > 5;
  const common = new Uint8Array(width * height);
  for (let p = 0; p < common.length; p++)
    common[p] = Number(skin(base, p * 4) && skin(variant, p * 4));
  const result = Buffer.from(variant);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x, i = p * 4;
    if (!common[p]) continue;
    // Keep donor lashes, pupils, sclera and newly exposed eyelid skin. Feather
    // only their immediate edge; the surrounding cheeks remain pixel-exact.
    let distance = 3;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < width && yy >= 0 && yy < height && !common[yy * width + xx])
        distance = Math.min(distance, Math.max(Math.abs(dx), Math.abs(dy)));
    }
    const weight = distance / 3;
    for (let c = 0; c < 3; c++)
      result[i + c] = Math.round(base[i + c] * weight + variant[i + c] * (1 - weight));
  }
  return result;
}
module.exports = { preserveBlinkSkin };
