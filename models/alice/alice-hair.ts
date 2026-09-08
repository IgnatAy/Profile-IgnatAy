import type { LayerRect, Spring } from './alice-rig';

type Surface = { width: number; height: number; getContext(type: '2d'): CanvasRenderingContext2D | null };
export type HairRibbon = {
  image: CanvasImageSource; layer: LayerRect; side: -1 | 1;
  width: number; height: number; root: number; pin: number; tip: number;
  restWidth: number;
  rows: { left: number; right: number; outer: number; inner: number }[];
};
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
const smooth = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const HAIR_MOTION_GAIN = .65;

/** Two coupled pendulums and a light tip mode. The head drives the middle,
 * which passes energy to the end with its own delay and damping. */
export function advanceHairChain(middle: Spring, end: Spring, flutter: Spring, side: -1 | 1, time: number, dt: number, headVelocity: number, headAcceleration: number, moving: boolean, strength: number) {
  dt = clamp(dt, 0, 1 / 30);
  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  const phase = side < 0 ? 0 : 1.25;
  const breeze = Math.sin(time * 1.16 + phase) * .065 + Math.sin(time * .53 - phase) * .035;
  // Slowly changing air pressure prevents a synchronized left/right metronome.
  const gust = (.5 + .5 * Math.sin(time * .31 + .7)) ** 3;
  const wind = breeze + Math.sin(time * 1.9 + phase * 1.7) * gust * .035;
  const force = moving ? (wind - headVelocity * .8 - clamp(headAcceleration, -1.5, 1.5) * .055) * strength * HAIR_MOTION_GAIN : 0;
  for (let i = 0; i < steps; i++) {
    const integrate = (s: Spring, goal: number, stiffness: number, damping: number, bound: number) => {
      s.velocity += ((goal - s.value) * stiffness - s.velocity * damping) * h;
      s.value += s.velocity * h;
      if (Math.abs(s.value) > bound) { s.value = clamp(s.value, -bound, bound); if (s.value * s.velocity > 0) s.velocity = 0; }
    };
    integrate(middle, force, side < 0 ? 32 : 27, 6.5, .22);
    integrate(end, moving ? middle.value * 1.3 - middle.velocity * .075 : 0, side < 0 ? 17 : 21, 4.2, .3);
    integrate(flutter, moving ? end.velocity * -.09 + Math.sin(time * 3.1 + phase) * gust * .012 * HAIR_MOTION_GAIN : 0, 38, 5, .065);
  }
}

/** Read the artwork silhouette once. Each row becomes a ribbon cross-section:
 * the outer edge can bend while the face-side seam stays pinned. */
export function prepareHairRibbon(image: CanvasImageSource, layer: LayerRect, side: -1 | 1, pin: number, tip: number, makeSurface: (width: number, height: number) => Surface): HairRibbon {
  const source = image as CanvasImageSource & { width: number; height: number };
  const surface = makeSurface(source.width, source.height), ctx = surface.getContext('2d');
  if (!ctx) throw new Error('Cannot prepare Alice hair ribbon');
  ctx.drawImage(image, 0, 0);
  const alpha = ctx.getImageData(0, 0, source.width, source.height).data;
  let first = source.height;
  const contour = Array.from({ length: source.height }, (_, y) => {
    let left = source.width, right = 0;
    for (let x = 0; x < source.width; x++) if (alpha[(y * source.width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = x + 1; }
    if (right > left) first = Math.min(first, y);
    return { left: Math.max(0, left - 2), right: Math.min(source.width, right + 2) };
  });
  const ry = source.height / layer.height, top = layer.y + first / ry;
  const root = Math.min(pin, top + Math.min(75, (pin - top) * .24));
  // Follow the shape of the whole lock, not every jagged individual hair in
  // the alpha mask. Otherwise adjacent rows would stretch by different ratios.
  const radius = Math.ceil(34 * ry);
  const rows = contour.map((row, y) => {
    let left = 0, right = 0, weight = 0;
    for (let i = Math.max(0, y - radius); i <= Math.min(source.height - 1, y + radius); i++) {
      if (contour[i].right <= contour[i].left) continue;
      const w = radius + 1 - Math.abs(y - i);
      left += contour[i].left * w; right += contour[i].right * w; weight += w;
    }
    const lo = weight ? left / weight : row.left, hi = weight ? right / weight : row.right;
    return { ...row, outer: side < 0 ? lo : hi, inner: side < 0 ? hi : lo };
  });
  const widths = rows.slice(Math.ceil((root - layer.y) * ry), Math.ceil((pin - layer.y) * ry)).filter(r => r.right > r.left).map(r => Math.abs(r.inner - r.outer) * layer.width / source.width).sort((a, b) => a - b);
  const restWidth = widths[Math.floor(widths.length * .6)] ?? 100;
  return { image, layer, side, width: source.width, height: source.height, root, pin, tip, restWidth, rows };
}

/** A cubic ribbon, with a separate middle bend, delayed tip and tip flutter.
 * Returning zero at the root with zero slope keeps the hat attachment rigid. */
export function hairRibbonOffset(t: number, length: number, middle: number, end: number, flutter: number) {
  t = clamp(t, 0, 1);
  return length * (3 * (1 - t) * t * t * middle + t * t * t * end + Math.sin(t * Math.PI) * t * t * flutter);
}

export function drawHairRibbon(ctx: CanvasRenderingContext2D, ribbon: HairRibbon, middle: number, end: number, flutter: number) {
  const { image, layer, width, height, root, pin, tip, side, rows } = ribbon;
  const rx = width / layer.width, ry = height / layer.height;
  const rootRow = Math.max(0, Math.min(height, Math.ceil((root - layer.y) * ry)));
  if (rootRow) ctx.drawImage(image, 0, 0, width, rootRow, layer.x, layer.y, layer.width, rootRow / ry);
  const length = Math.max(1, tip - root);
  for (let row = rootRow; row < height; row++) {
    const span = rows[row];
    if (span.right <= span.left) continue;
    const y = layer.y + (row + .5) / ry;
    const release = smooth((y - pin) / Math.max(1, tip - pin));
    const curve = hairRibbonOffset((y - root) / length, length, middle, end, flutter);
    // The outer contour has room to breathe. The inner contour only releases
    // below the jaw, with a shallow inward limit so it cannot sweep into skin.
    const outward = clamp(curve * side, -(ribbon.restWidth * .16 * (1 - release) + 6 * release), (ribbon.restWidth * .48 + 8) * (1 - release) + 54 * release);
    const outer = outward * side * rx, inner = outer * release * release;
    const guard = 6 * rx * (1 - release);
    const smoothHinge = span.inner + side * 16 * rx * (1 - release);
    const hinge = clamp(Math.round(side < 0 ? Math.min(smoothHinge, span.right - guard) : Math.max(smoothHinge, span.left + guard)), 1, width - 1);
    const lever = Math.max(35 * rx, Math.abs(hinge - span.outer));
    const stretch = clamp(1 + side * (outer - inner) / lever, .82, 1.45);
    const leftOffset = side < 0 ? inner - hinge * (stretch - 1) : inner;
    const rightOffset = side < 0 ? inner : inner + (width - hinge) * (stretch - 1);
    const draw = (start: number, finish: number, a: number, b: number) => {
      if (finish <= start) return;
      ctx.drawImage(image, start, row, finish - start, 1,
        layer.x + (start + a) / rx, layer.y + row / ry, (finish - start + b - a) / rx, 1 / ry);
    };
    // Disjoint source rows and a rigid inner seam retain the shared native
    // pixel grid; no overlapping alpha strips, per-frame readback or clipping.
    draw(0, hinge, leftOffset, inner);
    draw(hinge, width, inner, rightOffset);
  }
}
