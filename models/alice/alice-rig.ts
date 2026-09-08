/** An original-texture 2D cutout rig. All coordinates refer to the 1368×5392 source. */
import { REST_GESTURE, type IdleGesture } from './alice-motion';
import { advanceHairChain, drawHairRibbon, type HairRibbon } from './alice-hair';
import { aliceFraming } from './alice-framing';
export const RIG_WIDTH = 1368;
export const RIG_HEIGHT = 5392;
export const LAYERS = {
  backing: { x: 300, y: 820, width: 850, height: 380 },
  body: { x: 0, y: 0, width: 1368, height: 5392 },
  head: { x: 300, y: 0, width: 850, height: 1080 },
  hairLeft: { x: 300, y: 0, width: 850, height: 1080 },
  hairRight: { x: 300, y: 0, width: 850, height: 1080 },
  bow: { x: 300, y: 0, width: 850, height: 1080 },
  eyesOpen: { x: 470, y: 510, width: 370, height: 130 },
  eyesHalf: { x: 470, y: 510, width: 370, height: 130 },
  eyesClosed: { x: 470, y: 510, width: 370, height: 130 },
  mouth: { x: 612, y: 700, width: 100, height: 72 },
  mouthClosed: { x: 612, y: 700, width: 100, height: 72 },
} as const;
export type CoreLayerName = keyof typeof LAYERS;
export type PendantLayer = 'pomLeft' | 'pomRight';
export type LayerName = CoreLayerName | 'handFront' | 'headRest' | 'headTalk' | PendantLayer;
export type FaceFrameKey = `${'open' | 'half' | 'closed'}-${'rest' | 'talk'}`;
export type LayerRect = { x: number; y: number; width: number; height: number };
export type RigExpression = { id: string; image?: CanvasImageSource; mask?: CanvasImageSource; rect?: LayerRect };
export type RigImages = Record<CoreLayerName, CanvasImageSource> & Partial<Record<'handFront' | 'headRest' | 'headTalk' | PendantLayer, CanvasImageSource>> & {
  faceFrames?: Partial<Record<FaceFrameKey, CanvasImageSource>>;
  headComposite?: { image: CanvasImageSource; layer: LayerRect; paint: (frame: RigFrame) => void };
  hairRibbons?: { left: HairRibbon; right: HairRibbon };
};
export type RigDefinition = {
  width: number; height: number;
  layers: Record<CoreLayerName, LayerRect> & Partial<Record<'handFront' | 'headRest' | 'headTalk' | PendantLayer, LayerRect>>;
  rig: {
    headPivot: { x: number; y: number }; bodyPivot: { x: number; y: number };
    bodyRigidUntil: number; bodyFixedFrom: number;
    hairLeft: { pin: number; tip: number }; hairRight: { pin: number; tip: number };
    bowPivot: { x: number; y: number };
    arms: { spring: 'armFront' | 'armBack'; cx: number; cy: number; rx: number; ry: number; ex: number; ey: number }[];
    headGain: number; nodGain: number; blink: boolean; mouth: boolean;
    portraitCenterX?: number; portraitWidth?: number;
    pendants?: { layer: PendantLayer; pivot: { x: number; y: number }; gain: number; clip?: { x: number; y: number }[] }[];
  };
};
export const IDLE_RIG: RigDefinition = {
  width: RIG_WIDTH, height: RIG_HEIGHT, layers: LAYERS,
  rig: {
    headPivot: { x: 750, y: 850 }, bodyPivot: { x: 700, y: 2850 },
    bodyRigidUntil: 1250, bodyFixedFrom: 3200,
    hairLeft: { pin: 842, tip: 1030 }, hairRight: { pin: 872, tip: 1007 },
    bowPivot: { x: 1010, y: 514 },
    arms: [
      { spring: 'armFront', cx: 580, cy: 2090, rx: 570, ry: 440, ex: 1040, ey: 1780 },
      { spring: 'armBack', cx: 150, cy: 2300, rx: 180, ry: 430, ex: 245, ey: 1850 },
    ], headGain: 1, nodGain: 1, blink: true, mouth: true,
  },
};
export type Spring = { value: number; velocity: number };
export type RigState = { torso: Spring; lift: Spring; armFront: Spring; armBack: Spring; angle: Spring; nod: Spring; left: Spring; leftTip: Spring; leftFlutter: Spring; right: Spring; rightTip: Spring; rightFlutter: Spring; bow: Spring; spread: Spring; pomLeft: Spring; pomRight: Spring };
export function createRigState(): RigState {
  const spring = () => ({ value: 0, velocity: 0 });
  return { torso: spring(), lift: spring(), armFront: spring(), armBack: spring(), angle: spring(), nod: spring(), left: spring(), leftTip: spring(), leftFlutter: spring(), right: spring(), rightTip: spring(), rightFlutter: spring(), bow: spring(), spread: spring(), pomLeft: spring(), pomRight: spring() };
}
export function stepSpring(s: Spring, goal: number, dt: number, stiffness = 80, damping = 15) {
  dt = Math.max(0, Math.min(dt, 1 / 30));
  s.velocity += ((goal - s.value) * stiffness - s.velocity * damping) * dt;
  s.value += s.velocity * dt;
}
export function advanceRig(s: RigState, time: number, dt: number, motion: boolean, exploded: boolean, strength: number, gesture: IdleGesture = REST_GESTURE) {
  strength = Math.max(.3, Math.min(1.8, strength));
  const previousHeadVelocity = s.torso.velocity + s.angle.velocity;
  stepSpring(s.spread, exploded ? 1 : 0, dt, 70, 17);
  // The shoulders lead. The head adds only a small, slower adjustment on top
  // of that shared movement instead of reaching away from a stationary neck.
  const idle = motion ? Math.sin(time * .85) + Math.sin(time * .37) * .32 : 0;
  const g = motion && !exploded ? gesture : REST_GESTURE;
  stepSpring(s.torso, exploded ? 0 : (idle * .012 + g.lean * .062) * strength, dt, 48, 14);
  stepSpring(s.lift, exploded ? 0 : g.lift * 24 * strength, dt, 45, 14);
  stepSpring(s.angle, exploded ? 0 : (-idle * .005 + g.turn * .016) * strength, dt, 30, 12);
  stepSpring(s.nod, exploded ? 0 : g.nod * 3 * strength, dt, 30, 12);
  const armDrift = motion ? Math.sin(time * 1.1 - .65) * .012 * strength : 0;
  stepSpring(s.armFront, exploded ? 0 : -s.torso.value * .42 - s.torso.velocity * .32 + armDrift, dt, 32, 8);
  stepSpring(s.armBack, exploded ? 0 : -s.torso.value * .55 - s.torso.velocity * .42 - armDrift * .8, dt, 26, 7);
  const flow = motion && !exploded ? Math.sin(time * 1.4) * .009 * strength : 0;
  const headVelocity = s.torso.velocity + s.angle.velocity;
  const headAcceleration = (headVelocity - previousHeadVelocity) / Math.max(.001, Math.min(dt, 1 / 30));
  advanceHairChain(s.left, s.leftTip, s.leftFlutter, -1, time, dt, headVelocity, headAcceleration, motion && !exploded, strength);
  advanceHairChain(s.right, s.rightTip, s.rightFlutter, 1, time, dt, headVelocity, headAcceleration, motion && !exploded, strength);
  stepSpring(s.bow, exploded ? 0 : -headVelocity * .45 + flow * 1.5, dt, 75, 8);
  // Two suspended weights trail the torso, with different periods and damping.
  // They are independent of the head-mounted bow and stop under reduced motion.
  const pendantDrive = motion && !exploded ? -s.torso.velocity * 1.4 - s.torso.value * .3 : 0;
  stepSpring(s.pomLeft, pendantDrive + (motion && !exploded ? Math.sin(time * 1.9) * .012 * strength : 0), dt, 34, 5.2);
  stepSpring(s.pomRight, pendantDrive * .86 + (motion && !exploded ? Math.sin(time * 1.65 - .65) * .01 * strength : 0), dt, 43, 5.8);
  // Stop outward velocity at each limit so quick turns cannot store up a snap.
  const limit = (part: Spring, low: number, high: number) => {
    part.value = Math.max(low, Math.min(high, part.value));
    if ((part.value === low && part.velocity < 0) || (part.value === high && part.velocity > 0)) part.velocity = 0;
  };
  limit(s.torso, -.13, .13);
  limit(s.angle, -.038, .038);
  limit(s.nod, -5, 5);
  limit(s.bow, -.018, .018);
  limit(s.pomLeft, -.065, .065);
  limit(s.pomRight, -.055, .055);
  for (const part of [s.armFront, s.armBack]) limit(part, -.04, .04);
}
export type RigFrame = {
  state: RigState; time: number; fullBody: boolean; motion: boolean; strength: number;
  blink: 'open' | 'half' | 'closed'; mouthOpen: boolean; exploded: boolean;
  definition?: RigDefinition;
  portraitHeight?: number;
  portraitWidth?: number;
  expression?: RigExpression;
};
export const BODY_PIVOT = { x: 700, y: 2850 };
const smooth = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function upperBodyTransform(frame: RigFrame) {
  const breath = frame.motion && !frame.exploded ? Math.sin(frame.time * Math.PI * 2 / 5.2) * frame.strength : 0;
  return { angle: frame.state.torso.value, lift: frame.state.lift.value - breath * 10 };
}
/** Continuous skinning of the original coat, sleeves and gloves. The upper
 * neck is rigid; bending fades out through the hips and leaves both feet fixed.
 * Sleeve weights go to zero before the elbows, avoiding a detached hand edge. */
export function deformBodyPoint(x: number, y: number, frame: RigFrame) {
  const upper = upperBodyTransform(frame);
  const rig = (frame.definition ?? IDLE_RIG).rig;
  const weight = 1 - smooth((y - rig.bodyRigidUntil) / (rig.bodyFixedFrom - rig.bodyRigidUntil));
  const angle = upper.angle * weight, c = Math.cos(angle), sn = Math.sin(angle);
  const px = rig.bodyPivot.x, py = rig.bodyPivot.y;
  let dx = 0, dy = 0;
  const arm = (cx: number, cy: number, rx: number, ry: number, ex: number, ey: number, amount: number) => {
    const distance = Math.hypot((x - cx) / rx, (y - cy) / ry);
    const w = 1 - smooth((distance - .35) / .65);
    const a = amount * w, ca = Math.cos(a), sa = Math.sin(a);
    dx += (x - ex) * (ca - 1) - (y - ey) * sa;
    dy += (x - ex) * sa + (y - ey) * (ca - 1);
  };
  for (const joint of rig.arms) arm(joint.cx, joint.cy, joint.rx, joint.ry, joint.ex, joint.ey, frame.state[joint.spring].value);
  return { x: px + (x + dx - px) * c - (y + dy - py) * sn,
    y: py + (x + dx - px) * sn + (y + dy - py) * c + upper.lift * weight + frame.state.spread.value * 140 };
}
export type BodyPainter = (ctx: CanvasRenderingContext2D, images: RigImages, frame: RigFrame) => void;

/** Pendants attach to the coat at their cord roots, before the head is drawn. */
export function drawPendants(ctx: CanvasRenderingContext2D, images: RigImages, frame: RigFrame) {
  const definition = frame.definition ?? IDLE_RIG;
  const upper = upperBodyTransform(frame);
  for (const pendant of definition.rig.pendants ?? []) {
    const image = images[pendant.layer], rect = definition.layers[pendant.layer];
    if (!image || !rect) continue;
    const pivot = pendant.pivot;
    const anchor = deformBodyPoint(pivot.x, pivot.y, frame);
    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(upper.angle);
    ctx.translate(-pivot.x, -pivot.y);
    // A cuff in front of the leaning pose stays in front as the ball swings.
    if (pendant.clip) {
      ctx.beginPath();
      pendant.clip.forEach((point, index) => {
        if (index) ctx.lineTo(point.x, point.y);
        else ctx.moveTo(point.x, point.y);
      });
      ctx.closePath(); ctx.clip();
    }
    const spread = frame.state.spread.value;
    ctx.translate((pendant.layer === 'pomLeft' ? -1 : 1) * spread * 180, spread * 70);
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(frame.motion && !frame.exploded ? frame.state[pendant.layer].value * pendant.gain : 0);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
}
// The face-adjacent roots stay exactly attached to the head. Only the lower
// part of a lock bends, with zero displacement and slope at its attachment.
export function hairTipOffset(y: number, pin: number, tip: number, amount: number) {
  const t = Math.max(0, Math.min(1, (y - pin) / (tip - pin)));
  return amount * t * t * (3 - 2 * t);
}
export function drawHair(ctx: CanvasRenderingContext2D, image: CanvasImageSource, layer: LayerRect, pin: number, tip: number, amount: number) {
  if (amount === 0) { ctx.drawImage(image, layer.x, layer.y, layer.width, layer.height); return; }
  const source = image as { width: number; height: number };
  const ratioY = source.height / layer.height;
  const rootRows = Math.max(0, Math.min(source.height, Math.ceil((pin - layer.y) * ratioY)));
  if (rootRows) ctx.drawImage(image, 0, 0, source.width, rootRows, layer.x, layer.y, layer.width, rootRows / ratioY);
  // Draw each source row exactly once on the shared, unrotated head grid.
  // Overlapping translucent strips used to darken their edges and shimmer
  // when the head moved across device pixels. No overlap or render-mode jump.
  for (let row = rootRows; row < source.height; row++) {
    const y = layer.y + row / ratioY;
    const offset = hairTipOffset(y + .5 / ratioY, pin, tip, amount);
    ctx.drawImage(image, 0, row, source.width, 1, layer.x + offset, y, layer.width, 1 / ratioY);
  }
}

/** Compose attached cutouts before the final screen-space transform. */
export function drawHeadLayers(ctx: CanvasRenderingContext2D, images: RigImages, frame: RigFrame) {
  const definition = frame.definition ?? IDLE_RIG, rig = definition.rig;
  const s = frame.state, spread = s.spread.value;
  const draw = (id: LayerName) => {
    const layer = definition.layers[id], image = images[id];
    if (layer && image) ctx.drawImage(image, layer.x, layer.y, layer.width, layer.height);
  };
  // Native expressions contain their own eyes, brows, mouth and cheek details.
  // Neutral animation patches must not erase them or turn closed eyes back open.
  const nativeExpression = spread < .005 && frame.expression?.image;
  const eyeState = rig.blink && !nativeExpression ? frame.blink : 'open';
  const mouthState = frame.mouthOpen && rig.mouth && !nativeExpression ? 'talk' : 'rest';
  const face = spread < .005 ? images.faceFrames?.[`${eyeState}-${mouthState}`] : undefined;
  if (face) {
    const head = definition.layers.head;
    ctx.drawImage(face, head.x, head.y, head.width, head.height);
  } else draw('head');
  const hair = (side: 'left' | 'right') => {
    const ribbon = images.hairRibbons?.[side];
    if (ribbon) drawHairRibbon(ctx, ribbon, s[side].value, s[side === 'left' ? 'leftTip' : 'rightTip'].value, s[side === 'left' ? 'leftFlutter' : 'rightFlutter'].value);
    else {
      const id = side === 'left' ? 'hairLeft' : 'hairRight';
      drawHair(ctx, images[id], definition.layers[id], rig[id].pin, rig[id].tip, s[side].value * 230);
    }
  };
  ctx.save(); ctx.translate(-spread * 175, spread * 40); hair('left'); ctx.restore();
  ctx.save(); ctx.translate(spread * 170, spread * 48); hair('right'); ctx.restore();
  if (!face) {
    ctx.save(); ctx.translate(0, -spread * 165);
    draw(eyeState === 'closed' ? 'eyesClosed' : eyeState === 'half' ? 'eyesHalf' : 'eyesOpen');
    ctx.restore();
    ctx.save(); ctx.translate(-spread * 190, spread * 100); draw(mouthState === 'talk' ? 'mouth' : 'mouthClosed'); ctx.restore();
  }
  ctx.save(); ctx.translate(spread * 210 + rig.bowPivot.x, -spread * 100 + rig.bowPivot.y);
  ctx.rotate(s.bow.value); ctx.translate(-rig.bowPivot.x, -rig.bowPivot.y); draw('bow'); ctx.restore();
  if (nativeExpression && frame.expression?.rect && frame.expression.mask) {
    const rect = frame.expression.rect;
    // Replace only actual changed pixels; a rectangular clear would freeze
    // nearby moving hair and bows. The mask also removes obsolete alpha edges.
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Paint masks in device coordinates on the unrotated head surface. This
    // also avoids translated destination-out differences between Canvas backends.
    const matrix = ctx.getTransform();
    const nativeGrid = matrix.b === 0 && matrix.c === 0;
    const x = nativeGrid ? rect.x * matrix.a + matrix.e : rect.x;
    const y = nativeGrid ? rect.y * matrix.d + matrix.f : rect.y;
    const width = nativeGrid ? rect.width * matrix.a : rect.width;
    const height = nativeGrid ? rect.height * matrix.d : rect.height;
    if (nativeGrid) ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(frame.expression.mask, 0, 0, rect.width, rect.height, x, y, width, height);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(nativeExpression, 0, 0, rect.width, rect.height, x, y, width, height);
    ctx.restore();
  }
}
export function drawRig(ctx: CanvasRenderingContext2D, width: number, height: number, images: RigImages, frame: RigFrame, paintBody: BodyPainter) {
  ctx.clearRect(0, 0, width, height);
  const { state: s } = frame;
  const definition = frame.definition ?? IDLE_RIG;
  const rig = definition.rig;
  const spread = s.spread.value;
  const { scale, left, top } = aliceFraming(width, height, {
    width: definition.width, height: definition.height, centerX: rig.portraitCenterX,
  }, frame.fullBody, frame.portraitHeight, frame.portraitWidth);
  const draw = (id: LayerName) => {
    const layer = definition.layers[id], image = images[id];
    if (layer && image) ctx.drawImage(image, layer.x, layer.y, layer.width, layer.height);
  };
  const rotateAt = (x: number, y: number, angle: number) => { ctx.translate(x, y); ctx.rotate(angle); ctx.translate(-x, -y); };
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  paintBody(ctx, images, frame);
  drawPendants(ctx, images, frame);
  ctx.save();
  // Match the torso's rigid neck region exactly, then add the small local nod.
  // Body motion never scales the face.
  const upper = upperBodyTransform(frame);
  ctx.translate(0, upper.lift);
  rotateAt(rig.bodyPivot.x, rig.bodyPivot.y, upper.angle);
  ctx.translate(0, s.nod.value * rig.nodGain - spread * 20);
  rotateAt(rig.headPivot.x, rig.headPivot.y, s.angle.value * rig.headGain);
  const composite = spread < .005 ? images.headComposite : undefined;
  if (composite) {
    composite.paint(frame);
    const layer = composite.layer;
    ctx.drawImage(composite.image, layer.x, layer.y, layer.width, layer.height);
  } else drawHeadLayers(ctx, images, frame);
  if (images.handFront) { ctx.save(); ctx.translate(spread * 200, spread * 170); draw('handFront'); ctx.restore(); }
  ctx.restore(); ctx.restore();
}
