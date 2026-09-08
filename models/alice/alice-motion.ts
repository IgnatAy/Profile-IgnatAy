/** Larger idle gestures run on visible animation time. */
export type IdleGesture = { lean: number; lift: number; turn: number; nod: number };
export const REST_GESTURE: IdleGesture = { lean: 0, lift: 0, turn: 0, nod: 0 };
export type IdleMotion = {
  elapsed: number; nextAt: number; startedAt: number | null;
  variant: number; duration: number; gesture: IdleGesture; from: IdleGesture; target: IdleGesture;
};
export function createIdleMotion(random = Math.random): IdleMotion {
  return { elapsed: 0, nextAt: 2 + random() * 2, startedAt: null, variant: -1, duration: 0, gesture: REST_GESTURE, from: REST_GESTURE, target: REST_GESTURE };
}
const ease = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function advanceIdleMotion(state: IdleMotion, dt: number, active: boolean, random = Math.random): IdleGesture {
  // Reset the stance when autonomous motion stops; the rig springs return
  // the body smoothly to center.
  if (!active) {
    if (state.variant !== -1) Object.assign(state, createIdleMotion(random));
    return state.gesture;
  }
  state.elapsed += Math.max(0, Math.min(dt, 1 / 30));
  if (state.startedAt === null && state.elapsed >= state.nextAt) {
    const firstMove = state.variant === -1;
    const variants = [0, 1, 2, 3].filter(v => v !== state.variant);
    state.variant = variants[Math.floor(random() * variants.length)];
    const direction = random() < .5 ? -1 : 1;
    const energy = (.82 + random() * .18) * .8;
    const gestures: IdleGesture[] = [
      { lean: direction, lift: -.35, turn: -direction * .45, nod: -.2 }, // Shift weight.
      { lean: direction * .8, lift: -.85, turn: direction * .7, nod: -.65 }, // Peek forward.
      { lean: -direction * .75, lift: .65, turn: direction, nod: .45 }, // Lean back and glance.
      { lean: direction * .55, lift: .4, turn: -direction * .85, nod: .8 }, // Tilt and nod.
    ];
    const chosen = gestures[state.variant];
    state.from = state.gesture;
    state.target = { lean: chosen.lean * energy, lift: chosen.lift * energy, turn: chosen.turn * energy, nod: chosen.nod * energy };
    state.startedAt = state.elapsed;
    state.duration = firstMove ? .8 + random() * .4 : 1.8 + random() * .8;
  }
  if (state.startedAt === null) return state.gesture;
  const age = state.elapsed - state.startedAt;
  if (age >= state.duration) {
    state.startedAt = null;
    state.gesture = state.target;
    // Hold this stance for 2.5–4.5 seconds before choosing another.
    // There is no return pulse between gestures.
    state.nextAt = state.elapsed + 2.5 + random() * 2;
    return state.gesture;
  }
  const t = ease(age / state.duration), from = state.from, target = state.target;
  state.gesture = {
    lean: from.lean + (target.lean - from.lean) * t,
    lift: from.lift + (target.lift - from.lift) * t,
    turn: from.turn + (target.turn - from.turn) * t,
    nod: from.nod + (target.nod - from.nod) * t,
  };
  return state.gesture;
}
