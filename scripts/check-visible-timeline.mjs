import assert from 'node:assert/strict';
import { startVisibleTimeline } from '../lib/visible-timeline.ts';
import {
  ALICE_BUBBLE_MS,
  ALICE_EASTER_BUBBLE_DELAY_MS,
  ALICE_FADE_MS,
} from '../lib/interaction-timing.ts';

let now = 0,
  nextId = 0;
const timers = new Map(),
  listeners = new Set(),
  events = [];
const native = {
  document: globalThis.document,
  performance: globalThis.performance,
  setTimeout,
  clearTimeout,
};
globalThis.performance = { now: () => now };
globalThis.document = {
  hidden: false,
  addEventListener: (_name, fn) => listeners.add(fn),
  removeEventListener: (_name, fn) => listeners.delete(fn),
};
globalThis.setTimeout = (fn, delay) => {
  const id = ++nextId;
  timers.set(id, { at: now + delay, fn });
  return id;
};
globalThis.clearTimeout = (id) => timers.delete(id);
const advance = (ms) => {
  const end = now + ms;
  while (true) {
    const due = [...timers.entries()]
      .filter(([, timer]) => timer.at <= end)
      .sort((a, b) => a[1].at - b[1].at)[0];
    if (!due) break;
    now = due[1].at;
    timers.delete(due[0]);
    due[1].fn();
  }
  now = end;
};
const hidden = (value) => {
  document.hidden = value;
  [...listeners].forEach((fn) => fn());
};
try {
  assert.equal(ALICE_FADE_MS, 280);
  assert.equal(ALICE_EASTER_BUBBLE_DELAY_MS, 1500);
  assert.equal(ALICE_BUBBLE_MS, 4500);
  const stop = startVisibleTimeline([
    { after: ALICE_EASTER_BUBBLE_DELAY_MS, run: () => events.push('show') },
    {
      after: ALICE_EASTER_BUBBLE_DELAY_MS + ALICE_BUBBLE_MS,
      run: () => events.push('hide'),
    },
  ]);
  advance(1499);
  assert.deepEqual(events, []);
  hidden(true);
  advance(10000);
  assert.deepEqual(events, []);
  hidden(false);
  advance(1);
  assert.deepEqual(events, ['show']);
  advance(4499);
  assert.deepEqual(events, ['show']);
  hidden(true);
  advance(10000);
  hidden(false);
  advance(1);
  assert.deepEqual(events, ['show', 'hide']);
  hidden(true);
  hidden(false);
  advance(10000);
  assert.deepEqual(
    events,
    ['show', 'hide'],
    'Resuming must never revive a dismissed/expired bubble',
  );
  stop();
  assert.equal(listeners.size, 0);

  const cancel = startVisibleTimeline([
    {
      after: ALICE_BUBBLE_MS,
      run: () => assert.fail('Unmounted bubble fired'),
    },
  ]);
  advance(1000);
  cancel();
  advance(5000);
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
  let chatVisible = true;
  const stopChat = startVisibleTimeline([
    {
      after: ALICE_BUBBLE_MS,
      run: () => {
        chatVisible = false;
      },
    },
  ]);
  advance(4499);
  assert.equal(chatVisible, true);
  advance(1);
  assert.equal(chatVisible, false);
  stopChat();
  console.log(
    'PASS: 280ms fades, 1.5s Easter delay, 4.5s Easter/chat lifetime, background pause, once-only events and unmount cancellation.',
  );
} finally {
  Object.assign(globalThis, native);
}
