import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Execute the actual transition component with a controlled animation clock.
const hooks = [],
  effects = [],
  animations = [],
  surfaces = new Map(),
  shown = [];
let cursor = 0,
  dirty = false,
  reduced = false;
const equal = (a, b) =>
  a?.length === b?.length && a.every((v, i) => Object.is(v, b[i]));
function surface(id) {
  if (!surfaces.has(id))
    surfaces.set(id, {
      id,
      animate(keyframes, options) {
        let resolve, reject;
        const animation = {
          id,
          keyframes,
          options,
          cancelled: false,
          finished: new Promise((yes, no) => {
            resolve = yes;
            reject = no;
          }),
          finish: () => resolve(),
          cancel() {
            this.cancelled = true;
            reject(new Error('cancelled'));
          },
        };
        animations.push(animation);
        return animation;
      },
    });
  return surfaces.get(id);
}
globalThis.__fadedSwapTest = {
  ALICE_FADE_MS: 280,
  getReducedMotion: () => reduced,
  subscribeReducedMotion() {},
  useSyncExternalStore: (_subscribe, get) => get(),
  useState(initial) {
    const index = cursor++;
    hooks[index] ??= {
      value: typeof initial === 'function' ? initial() : initial,
    };
    return [
      hooks[index].value,
      (next) => {
        const value =
          typeof next === 'function' ? next(hooks[index].value) : next;
        if (!Object.is(value, hooks[index].value)) {
          hooks[index].value = value;
          dirty = true;
        }
      },
    ];
  },
  useRef(initial) {
    return (hooks[cursor++] ??= { current: initial });
  },
  useCallback(fn, deps) {
    const index = cursor++;
    if (!equal(hooks[index]?.deps, deps)) hooks[index] = { fn, deps };
    return hooks[index].fn;
  },
  useLayoutEffect(run, deps) {
    const index = cursor++,
      previous = hooks[index];
    if (!deps || !equal(previous?.deps, deps))
      effects.push(() => {
        previous?.cleanup?.();
        hooks[index] = { deps, cleanup: run() };
      });
  },
  jsx(type, props, key) {
    if (props.surface) props.surface.current = surface(props.value);
    return { type, props, key };
  },
};
globalThis.__fadedSwapTest.jsxs = globalThis.__fadedSwapTest.jsx;
const hookModule = `data:text/javascript,${encodeURIComponent(`export const { ${Object.keys(globalThis.__fadedSwapTest).join(', ')} } = globalThis.__fadedSwapTest;`)}`;
const source = await readFile(
  new URL('../components/faded-swap.tsx', import.meta.url),
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
  .outputText.replace(
    /from ['"][^'"]+['"]/g,
    `from ${JSON.stringify(hookModule)}`,
  );
const { FadedSwap } = await import(
  `data:text/javascript,${encodeURIComponent(compiled)}`
);
const props = {
  value: 'winter',
  children: () => null,
  onShown: (id) => shown.push(id),
};
let tree;
function render(value = props.value) {
  props.value = value;
  let passes = 0;
  do {
    assert(++passes < 20, 'Render loop');
    dirty = false;
    cursor = 0;
    effects.length = 0;
    tree = FadedSwap(props);
    // React discards a render that adjusts its own state before committing.
    if (!dirty) while (effects.length) effects.shift()();
  } while (dirty);
  return tree.props.children;
}
const slots = () => tree.props.children;
function ready(id) {
  slots()
    .find((slot) => slot.props.value === id)
    .props.prepared(id);
  render();
}
async function finish() {
  animations.at(-1).finish();
  await Promise.resolve();
  await Promise.resolve();
  render();
}

render();
ready('winter');
assert.deepEqual(animations.at(-1).keyframes, [{ opacity: 0 }, { opacity: 1 }]);
assert.deepEqual(shown, []);
await finish();
assert.deepEqual(shown, ['winter']);
const beforeLoad = animations.length;
render('penguin');
assert.deepEqual(
  slots().map((slot) => [slot.key, slot.props.active]),
  [
    ['winter', true],
    ['penguin', false],
  ],
);
assert.equal(
  animations.length,
  beforeLoad,
  'Old live content is retained while incoming content prepares',
);
ready('penguin');
assert.deepEqual(animations.at(-1).keyframes, [{ opacity: 1 }, { opacity: 0 }]);
assert.equal(animations.at(-1).options.duration, 280);
assert.equal(slots()[0].props.value, 'winter', 'No swap before fade-out ends');
await finish();
assert.equal(slots().length, 1);
assert.equal(
  slots()[0].key,
  'penguin',
  'Prepared slot keeps its key across promotion',
);
assert.deepEqual(animations.at(-1).keyframes, [{ opacity: 0 }, { opacity: 1 }]);
assert.deepEqual(
  shown,
  ['winter'],
  'Arrival callback waits until the new content is fully visible',
);
await finish();
assert.deepEqual(shown, ['winter', 'penguin']);

render('cape');
const supersededReady = slots()[1].props.prepared;
ready('cape');
const cancelledFade = animations.at(-1);
render('dress');
assert.equal(cancelledFade.cancelled, true);
supersededReady('cape');
render();
assert.equal(slots()[0].key, 'penguin');
assert.deepEqual(
  slots().map((slot) => slot.key),
  ['penguin', 'dress'],
);
ready('dress');
await finish();
await finish();
assert.equal(shown.at(-1), 'dress');
assert(!shown.includes('cape'), 'Superseded content must never appear');

reduced = true;
const beforeReduced = animations.length;
render('winter');
ready('winter');
await Promise.resolve();
render();
await Promise.resolve();
render();
assert.equal(
  animations.length,
  beforeReduced,
  'Reduced motion skips both fades',
);
assert.equal(shown.at(-1), 'winter');
for (const hook of hooks) hook?.cleanup?.();
delete globalThis.__fadedSwapTest;
console.log(
  'PASS: live preparation before 280ms fade-out/in, stable incoming key, post-fade arrival, cancellation of rapid navigation, stale readiness and reduced motion.',
);
