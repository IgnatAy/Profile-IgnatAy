import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
try {
  const { createAliceReplyParser } = await server.ssrLoadModule(
    '/lib/alice-reply-parser.ts',
  );
  const { ALICE_EMOTIONS } = await server.ssrLoadModule(
    '/lib/alice-emotions.ts',
  );
  const { ALICE_MODELS } = await server.ssrLoadModule(
    '/models/alice/alice-models.ts',
  );
  const { getAliceExpressions } = await server.ssrLoadModule(
    '/models/alice/alice-expressions.ts',
  );
  const { ALICE_AFFECT_MAP, pickAliceAppearance } = await server.ssrLoadModule(
    '/models/alice/alice-affect-selection.ts',
  );
  const { createAliceAffectStore } = await server.ssrLoadModule(
    '/lib/alice-affect.ts',
  );
  const { startAliceDwell, ALICE_DWELL_MS } = await server.ssrLoadModule(
    '/lib/alice-dwell.ts',
  );
  const tagged = ' \n[[AFFECT:proud:0.65]]\n正文';
  for (let split = 0; split <= tagged.length; split++) {
    const emotions = [];
    const parser = createAliceReplyParser((cue) => emotions.push(cue));
    const partial = parser.push(tagged.slice(0, split));
    assert(!partial.includes('AFFECT') && !partial.includes('[['));
    assert.equal(parser.push(tagged), '正文');
    assert.equal(parser.push(tagged, true), '正文');
    assert.deepEqual(emotions, [{ emotion: 'proud', intensity: 0.65 }]);
  }
  for (const header of [
    '[[AFFECT:nope:0.5]]',
    '[[AFFECT:angry:-1]]',
    '[[AFFECT:angry:1.1]]',
    '[[AFFECT:angry:NaN]]',
    '[[AFFECT:angry:Infinity]]',
    '[[AFFECT:proud]]',
    `[[AFFECT:${'a'.repeat(160)}:0.5]]`,
    '[[AFFECT:angry:0.5\n',
  ]) {
    const emotions = [];
    const parser = createAliceReplyParser((cue) => emotions.push(cue));
    const raw = `${header}\n回答`;
    for (let end = 0; end <= raw.length; end++) {
      const text = parser.push(raw.slice(0, end));
      assert(!text.includes('AFFECT'), 'Malformed reserved headers never leak');
    }
    assert.equal(parser.push(raw, true), '回答');
    assert.equal(emotions.length, 1);
    assert.equal(emotions[0].emotion, 'neutral');
  }
  for (const plain of ['普通回答', '[括号]', '[[普通文本]]', '[', '[[']) {
    const parser = createAliceReplyParser();
    assert.equal(parser.push(plain, true), plain);
  }
  const parser = createAliceReplyParser();
  assert.equal(
    parser.push('正文 [[AFFECT:angry:1]]'),
    '正文 [[AFFECT:angry:1]]',
  );
  assert.equal(createAliceReplyParser().push('[[AFFECT:proud:0.65', true), '');

  let count = 0;
  for (const [model, definition] of Object.entries(ALICE_MODELS)) {
    assert.deepEqual(
      Object.keys(ALICE_AFFECT_MAP[model]).sort(),
      [...definition.poses].sort((a, b) => a.localeCompare(b)),
    );
    for (const pose of definition.poses) {
      const expressions = getAliceExpressions(model, pose);
      assert.deepEqual(
        Object.keys(ALICE_AFFECT_MAP[model][pose]).sort(),
        expressions.map((e) => e.id).sort(),
      );
      for (const expression of expressions) {
        const row = ALICE_AFFECT_MAP[model][pose][expression.id];
        count++;
        assert(row.cues.length > 0);
        assert.equal(row.intensity.length, 2);
        assert(
          row.intensity[0] >= 0 &&
            row.intensity[1] <= 1 &&
            row.intensity[0] <= row.intensity[1],
        );
        assert(Object.keys(row.emotions).length);
        for (const [emotion, weight] of Object.entries(row.emotions)) {
          assert(ALICE_EMOTIONS.includes(emotion));
          assert(weight > 0 && weight <= 1);
        }
      }
    }
    for (const emotion of ALICE_EMOTIONS)
      for (const intensity of [0, 0.3, 0.65, 1]) {
        for (const roll of [0, 0.3, 0.7, 0.9999]) {
          const selected = pickAliceAppearance(
            model,
            { emotion, intensity },
            undefined,
            () => roll,
          );
          assert(
            getAliceExpressions(model, selected.pose).some(
              (e) => e.id === selected.expressionId,
            ),
          );
          const row =
            ALICE_AFFECT_MAP[model][selected.pose][selected.expressionId];
          assert(row.emotions[selected.resolvedEmotion] > 0);
          if (row.intensity[0] >= 0.8) assert(intensity >= row.intensity[0]);
        }
      }
  }
  assert.equal(count, 144);
  for (const model of ['winter', 'cloak'])
    assert.equal(
      pickAliceAppearance(model, { emotion: 'angry', intensity: 1 })
        .resolvedEmotion,
      'annoyed',
    );
  assert.equal(
    pickAliceAppearance('penguin', { emotion: 'proud', intensity: 0.65 })
      .resolvedEmotion,
    'neutral',
  );

  // Actual foreground scheduling: hidden/blur/chat time is never counted.
  let now = 0,
    serial = 0,
    focused = true;
  const timers = new Map();
  const docEvents = new Map(),
    winEvents = new Map();
  const surface = (events) => ({
    addEventListener(name, fn) {
      if (!events.has(name)) events.set(name, new Set());
      events.get(name).add(fn);
    },
    removeEventListener(name, fn) {
      events.get(name)?.delete(fn);
    },
  });
  const native = {
    document: globalThis.document,
    window: globalThis.window,
    performance: globalThis.performance,
    setTimeout,
    clearTimeout,
  };
  globalThis.document = {
    ...surface(docEvents),
    hidden: false,
    hasFocus: () => focused,
  };
  globalThis.window = surface(winEvents);
  globalThis.performance = { now: () => now };
  globalThis.setTimeout = (fn, delay) => {
    const id = ++serial;
    timers.set(id, { at: now + delay, fn });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const emit = (events, name) =>
    [...(events.get(name) ?? [])].forEach((fn) => fn());
  const advance = (ms) => {
    const end = now + ms;
    while (true) {
      const due = [...timers]
        .filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at;
      timers.delete(due[0]);
      due[1].fn();
    }
    now = end;
  };
  try {
    let reads = 0;
    const dwell = startAliceDwell(() => reads++);
    advance(20_000);
    document.hidden = true;
    emit(docEvents, 'visibilitychange');
    advance(120_000);
    assert.equal(reads, 0);
    document.hidden = false;
    focused = false;
    emit(docEvents, 'visibilitychange');
    advance(120_000);
    assert.equal(reads, 0);
    focused = true;
    emit(winEvents, 'focus');
    advance(10_000);
    dwell.setEnabled(false);
    advance(120_000);
    assert.equal(reads, 0);
    dwell.setEnabled(true);
    advance(ALICE_DWELL_MS - 30_000 - 1);
    assert.equal(reads, 0);
    advance(1);
    assert.equal(reads, 1);
    emit(winEvents, 'focus');
    advance(100_000);
    assert.equal(reads, 1);
    dwell.dispose();
    const cancelled = startAliceDwell(() =>
      assert.fail('Old section reaction'),
    );
    advance(30_000);
    cancelled.dispose();
    advance(60_000);

    const store = createAliceAffectStore();
    assert.equal(store.getSnapshot(), null);
    store.request({
      emotion: 'proud',
      intensity: 0.65,
      source: 'dwell',
      priority: 40,
      holdMs: 6000,
    });
    advance(3000);
    document.hidden = true;
    emit(docEvents, 'visibilitychange');
    advance(60_000);
    assert.equal(store.getSnapshot().emotion, 'proud');
    document.hidden = false;
    emit(docEvents, 'visibilitychange');
    advance(3000);
    assert.equal(store.getSnapshot().emotion, 'neutral');
    advance(1200);
    assert.equal(store.getSnapshot(), null);
    store.request({
      emotion: 'annoyed',
      intensity: 0.5,
      source: 'chat',
      priority: 80,
      locked: true,
      holdMs: 0,
    });
    const id = store.getSnapshot().id;
    assert.equal(
      store.request({
        emotion: 'proud',
        intensity: 0.65,
        source: 'dwell',
        priority: 40,
        holdMs: 6000,
      }),
      false,
    );
    advance(100_000);
    assert.equal(store.getSnapshot().emotion, 'annoyed');
    store.request({
      emotion: 'annoyed',
      intensity: 0.3,
      source: 'chat',
      priority: 80,
      locked: true,
      holdMs: 0,
    });
    assert.equal(store.getSnapshot().id, id);
    assert.equal(store.getSnapshot().intensity, 0.5);
    store.finishChat();
    advance(4500);
    assert.equal(store.getSnapshot().emotion, 'neutral');
    advance(1200);
    assert.equal(store.getSnapshot(), null, 'No queued old reading reaction');
    store.request({
      emotion: 'proud',
      intensity: 0.65,
      source: 'dwell',
      priority: 40,
      holdMs: 6000,
    });
    store.leaveSection();
    assert.equal(store.getSnapshot(), null);
    store.reset();
    // Only completed, sufficiently annoyed replies count. Provisional provider
    // cues, mild irritation, positive replies and transient resets cannot inflate it.
    const irritated = { emotion: 'annoyed', intensity: 0.5 };
    for (let i = 0; i < 10; i++) {
      store.request({
        ...irritated,
        source: 'chat',
        priority: 80,
        locked: true,
        holdMs: 0,
      });
      store.reset();
      store.recordChatReaction({ emotion: 'annoyed', intensity: 0.49 });
      store.recordChatReaction({ emotion: 'proud', intensity: 1 });
    }
    assert.equal(store.getSnapshot(), null);
    store.recordChatReaction(irritated);
    store.reset();
    store.recordChatReaction({ emotion: 'angry', intensity: 1 });
    assert.notEqual(
      store.getSnapshot()?.source,
      'boundary',
      'One strong cue cannot skip the cumulative threshold',
    );
    store.recordChatReaction(irritated);
    const terminal = store.getSnapshot();
    assert.equal(terminal.source, 'boundary');
    assert.equal(terminal.emotion, 'angry');
    assert.equal(terminal.intensity, 1);
    assert.equal(terminal.locked, true);
    store.finishChat();
    store.reset();
    store.leaveSection();
    store.recordChatReaction({ emotion: 'neutral', intensity: 0.3 });
    assert.equal(
      store.request({
        emotion: 'thinking',
        intensity: 0.5,
        source: 'chat',
        priority: 999,
        locked: true,
        holdMs: 0,
      }),
      false,
    );
    advance(1_000_000);
    assert.equal(
      store.getSnapshot(),
      terminal,
      'Terminal anger survives timers, errors, attention and remount cleanup',
    );
    assert.equal(
      createAliceAffectStore().getSnapshot(),
      null,
      'A fresh document is unlocked',
    );
    assert.equal(timers.size, 0);
    assert.equal(
      [...docEvents.values(), ...winEvents.values()].reduce(
        (sum, set) => sum + set.size,
        0,
      ),
      0,
    );
  } finally {
    Object.assign(globalThis, native);
  }
  console.log(
    'PASS: 144 reviewed states, 6 outfits × 9 emotions with safe fallbacks, prefix boundaries, foreground dwell, priority, expiry, no stale reactions and cleanup.',
  );
} finally {
  await server.close();
}
