import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const slots = [],
  effects = [],
  timers = new Map();
let cursor = 0,
  serial = 0,
  dirty = false,
  time = 0;
const props = { model: 'dress', pose: 'idle', motion: true, visible: true };
globalThis.__aliceExpressionClock = {
  useState(initial) {
    const index = cursor++;
    slots[index] ??= { value: initial };
    return [
      slots[index].value,
      (next) => {
        slots[index].value =
          typeof next === 'function' ? next(slots[index].value) : next;
        dirty = true;
      },
    ];
  },
  useEffect(run, deps) {
    const index = cursor++,
      old = slots[index];
    if (!old || deps.some((value, i) => value !== old.deps[i]))
      effects.push(() => {
        old?.cleanup?.();
        slots[index] = { deps, cleanup: run() };
      });
  },
};
const hookModule = `data:text/javascript,${encodeURIComponent('export const {useState,useEffect} = globalThis.__aliceExpressionClock;')}`;
const source = await readFile(
  new URL('../models/alice/use-alice-expression.ts', import.meta.url),
  'utf8',
);
const compiled = ts
  .transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  })
  .outputText.replace(
    /from ['"]([^'"]+)['"]/g,
    (_match, specifier) =>
      `from ${JSON.stringify(specifier === 'react' ? hookModule : new URL('../models/alice/alice-expressions.ts', import.meta.url).href)}`,
  );
const nativeTimeout = globalThis.setTimeout,
  nativeClear = globalThis.clearTimeout,
  nativeRandom = Math.random;
globalThis.setTimeout = (callback, delay) => {
  timers.set(++serial, { callback, at: time + delay });
  return serial;
};
globalThis.clearTimeout = (id) => timers.delete(id);
Math.random = () => 0;
try {
  const { useAliceExpression } = await import(
    `data:text/javascript,${encodeURIComponent(compiled)}`
  );
  let selected;
  function render() {
    do {
      dirty = false;
      cursor = 0;
      // oxlint-disable-next-line react-hooks/rules-of-hooks -- Deterministic React effect harness.
      selected = useAliceExpression(
        props.model,
        props.pose,
        props.motion,
        props.visible,
        props.controlledId,
      );
      while (effects.length) effects.shift()();
    } while (dirty);
  }
  function advance(ms) {
    time += ms;
    // oxlint-disable-next-line unicorn/no-useless-spread -- New timers belong to the next clock tick.
    for (const [id, timer] of [...timers])
      if (timer.at <= time) {
        timers.delete(id);
        timer.callback();
      }
    render();
  }
  render();
  advance(0);
  const first = selected.id;
  advance(3999);
  assert.equal(
    selected.id,
    first,
    'Expressions persist beyond a blink duration',
  );
  advance(1);
  assert.notEqual(
    selected.id,
    first,
    'One pose changes expression without a pose event',
  );
  props.controlledId = '12_02_08';
  render();
  assert.equal(selected.id, '12_02_08');
  assert.equal(
    timers.size,
    0,
    'Controlled emotion pauses both expression clocks',
  );
  advance(60000);
  assert.equal(
    selected.id,
    '12_02_08',
    'Native emotion remains throughout a reply',
  );
  props.controlledId = undefined;
  render();
  advance(0);
  advance(4000);
  const resumed = selected.id;
  props.visible = false;
  render();
  assert.equal(timers.size, 0, 'Background tabs cancel the expression clock');
  advance(30000);
  assert.equal(selected.id, resumed);
  props.visible = true;
  render();
  advance(3999);
  assert.equal(
    selected.id,
    resumed,
    'Resume gives a fresh hold, not a burst of missed expressions',
  );
  advance(1);
  assert.notEqual(selected.id, resumed);
  props.motion = false;
  render();
  assert.equal(timers.size, 0);
  const still = selected.id;
  advance(60000);
  assert.equal(selected.id, still, 'Reduced motion remains still');
  props.model = 'winter';
  props.pose = 'profile';
  render();
  advance(0);
  assert.equal(selected.id, '08_17_00');
  assert.equal(timers.size, 0, 'Single-source poses have no random loop');
  props.model = 'cape';
  props.pose = 'relaxed';
  props.motion = true;
  render();
  advance(0);
  assert(selected.id.startsWith('13_'));
  for (const slot of slots) slot?.cleanup?.();
  assert.equal(timers.size, 0, 'Unmount clears all timers');
  console.log(
    'PASS: actual expression hook holds, changes within a pose, pauses when hidden/reduced, isolates outfits and cleans up.',
  );
} finally {
  globalThis.setTimeout = nativeTimeout;
  globalThis.clearTimeout = nativeClear;
  Math.random = nativeRandom;
  delete globalThis.__aliceExpressionClock;
}
