import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the real component's effects with a deterministic canvas/frame clock.
// No browser timing or network cache is needed to reproduce a delayed pose load.
const slots = [],
  effects = [],
  frames = new Map(),
  loads = new Map();
const draws = [],
  ready = [];
const fades = [];
const expressionLoads = new Map();
let controlExpressions = false;
let cursor = 0,
  frameId = 0,
  dirty = false,
  disposed = 0;
const ctx = { setTransform() {} };
const owner = { clientWidth: 200, clientHeight: 400 };
const canvas = {
  width: 200,
  height: 400,
  dataset: {},
  getContext: () => ctx,
  closest: () => owner,
  animate(keyframes, options) {
    let finish, reject;
    const finished = new Promise((resolve, fail) => {
      finish = resolve;
      reject = fail;
    });
    // A fade-in has no awaiting caller, just as a completed visual animation.
    finished.catch(() => {});
    const fade = {
      keyframes,
      options,
      finished,
      finish,
      cancelled: false,
      cancel() {
        this.cancelled = true;
        reject(new Error('Animation cancelled'));
      },
    };
    fades.push(fade);
    return fade;
  },
};
const ref = (value) => {
  const index = cursor++;
  return (slots[index] ??= { current: value });
};
const effect = (run, deps) => {
  const index = cursor++;
  const previous = slots[index];
  if (
    !deps ||
    !previous ||
    deps.some((value, i) => value !== previous.deps[i])
  ) {
    effects.push(() => {
      previous?.cleanup?.();
      slots[index] = { deps, cleanup: run() };
    });
  }
};
globalThis.__aliceTransitionTest = {
  useRef: ref,
  useEffect: effect,
  useLayoutEffect: effect,
  useState(value) {
    const index = cursor++;
    slots[index] ??= { value };
    return [
      slots[index].value,
      (next) => {
        slots[index].value = next;
        dirty = true;
      },
    ];
  },
  jsx(_tag, props) {
    if (props.ref) props.ref.current = canvas;
    return props;
  },
  createRigState: () => ({ ticks: 0 }),
  advanceRig(state) {
    state.ticks++;
  },
  drawRig(_ctx, width, height, _images, frame) {
    draws.push({
      pose: frame.definition.pose,
      ticks: frame.state.ticks,
      width,
      height,
      expression: frame.expression?.id,
    });
  },
  createBodyRenderer: () => ({
    paint() {},
    dispose() {
      disposed++;
    },
  }),
  createIdleMotion: () => ({ startedAt: null }),
  advanceIdleMotion() {},
  loadRigAsset(pose) {
    return new Promise((resolve, reject) =>
      loads.set(pose, { resolve, reject }),
    );
  },
  loadRigExpression(_asset, expression) {
    if (!controlExpressions) return Promise.resolve({ id: expression.id });
    return new Promise((resolve) =>
      expressionLoads.set(expression.id, () => resolve({ id: expression.id })),
    );
  },
};
const hookModule = `data:text/javascript,${encodeURIComponent(
  `export const { ${Object.keys(globalThis.__aliceTransitionTest).join(', ')} } = globalThis.__aliceTransitionTest;`,
)}`;
const source = await readFile(
  new URL('../models/alice/layered-alice.tsx', import.meta.url),
  'utf8',
);
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  })
  .outputText.replace(/from ['"]([^'"]+)['"]/g, (_match, specifier) => {
    const url = ['./alice-frame-loop', './alice-expressions'].includes(
      specifier,
    )
      ? new URL(`../models/alice/${specifier.slice(2)}.ts`, import.meta.url)
          .href
      : hookModule;
    return `from ${JSON.stringify(url)}`;
  });
globalThis.window = { devicePixelRatio: 1 };
globalThis.document = {
  hidden: false,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.requestAnimationFrame = (callback) => {
  frames.set(++frameId, callback);
  return frameId;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.IntersectionObserver = class {
  observe() {}
  disconnect() {}
};
const { LayeredAlice } = await import(
  `data:text/javascript,${encodeURIComponent(compiled)}`
);
const props = {
  model: 'winter',
  pose: 'idle',
  enabled: true,
  motion: true,
  speaking: false,
  fullBody: false,
  exploded: false,
  strength: 1,
  blinkSignal: 0,
  onReady: (pose) => ready.push(pose),
  onError: () => assert.fail('Unexpected load error'),
};
function render(pose = props.pose) {
  props.pose = pose;
  do {
    dirty = false;
    cursor = 0;
    LayeredAlice({ ...props });
    while (effects.length) effects.shift()();
  } while (dirty);
}
function tick() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(performance.now() + 100));
}
async function resolve(pose) {
  loads
    .get(pose)
    .resolve({
      model: 'winter',
      pose,
      images: {},
      definition: { pose, rig: { blink: false, mouth: false } },
    });
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  render();
}
async function finishFade() {
  const outgoing = fades.at(-1);
  assert.deepEqual(outgoing.keyframes, [{ opacity: 1 }, { opacity: 0 }]);
  assert.equal(outgoing.options.duration, 280);
  outgoing.finish();
  await Promise.resolve();
  render();
  assert(
    outgoing.cancelled,
    'Outgoing opacity is released after the replacement paints',
  );
  assert.deepEqual(fades.at(-1).keyframes, [{ opacity: 0 }, { opacity: 1 }]);
}
render();
await resolve('idle');
assert.deepEqual(ready, ['idle']);
assert.equal(draws.at(-1).pose, 'idle');
controlExpressions = true;
props.expression = '08_02_01';
render();
tick();
assert.equal(
  draws.at(-1).expression,
  '08_02_00',
  'Delayed expression keeps the old decoded face',
);
const beforeExpression = draws.at(-1).ticks;
expressionLoads.get('08_02_01')();
await Promise.resolve();
tick();
assert.equal(draws.at(-1).expression, '08_02_01');
assert(
  draws.at(-1).ticks > beforeExpression,
  'Expression changes preserve body motion',
);
assert.equal(disposed, 0, 'Expression changes reuse the renderer');
assert.equal(
  fades.length,
  0,
  'Expression changes do not fade the whole character',
);
props.expression = '08_02_02';
render();
props.expression = undefined;
controlExpressions = false;
render('front');
expressionLoads.get('08_02_02')();
await Promise.resolve();
tick();
assert.equal(
  draws.at(-1).expression,
  '08_02_01',
  'A superseded face cannot replace the outgoing pose',
);
assert.equal(disposed, 0, 'Loading a pose must keep the old renderer alive');
assert.equal(
  draws.at(-1).pose,
  'idle',
  'Old pose keeps animating during loading',
);
const before = draws.at(-1).ticks;
await resolve('front');
assert.equal(
  draws.at(-1).pose,
  'idle',
  'Decoded replacement waits for fade-out',
);
assert.deepEqual(ready, ['idle']);
await finishFade();
assert.equal(draws.at(-1).pose, 'front', 'New pose paints before readiness');
assert(draws.at(-1).ticks > before, 'Pose swap preserves spring state');
assert.deepEqual(ready, ['idle', 'front']);
assert.equal(draws.at(-1).width, owner.clientWidth);
render('shy');
render('thinking');
await resolve('shy');
assert.equal(
  draws.at(-1).pose,
  'front',
  'Superseded load cannot replace the visible pose',
);
await resolve('thinking');
await finishFade();
assert.equal(draws.at(-1).pose, 'thinking');
assert.deepEqual(ready, ['idle', 'front', 'thinking']);
render('shy');
await resolve('shy');
const cancelledFade = fades.at(-1);
render('front');
assert(cancelledFade.cancelled, 'A superseded fade is cancelled');
assert.equal(draws.at(-1).pose, 'thinking');
props.motion = false;
render();
const fadeCount = fades.length;
await resolve('front');
assert.equal(fades.length, fadeCount, 'Reduced motion swaps without fading');
assert.deepEqual(ready, ['idle', 'front', 'thinking', 'front']);
for (const slot of slots) slot?.cleanup?.();
assert.equal(frames.size, 0, 'Unmount cancels every scheduled frame');
assert.equal(disposed, 4, 'Each active renderer is released exactly once');
delete globalThis.__aliceTransitionTest;
console.log(
  'PASS: delayed pose handoff, continuous motion, first-frame readiness, superseded loads, layout sizing and cleanup.',
);
