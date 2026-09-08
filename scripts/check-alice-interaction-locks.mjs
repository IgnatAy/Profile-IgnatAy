import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the real chat and arrival handlers without network requests or a browser.
let now = 0,
  timerId = 0,
  calls = 0,
  harnessId = 0;
const timers = new Map(),
  visibility = new Set();
const native = {
  document: globalThis.document,
  performance: globalThis.performance,
  setTimeout,
  clearTimeout,
};
globalThis.document = {
  hidden: false,
  addEventListener(name, fn) {
    if (name === 'visibilitychange') visibility.add(fn);
  },
  removeEventListener(name, fn) {
    if (name === 'visibilitychange') visibility.delete(fn);
  },
};
globalThis.performance = { now: () => now };
globalThis.setTimeout = (fn, delay) => {
  timers.set(++timerId, { fn, at: now + delay });
  return timerId;
};
globalThis.clearTimeout = (id) => timers.delete(id);
function advance(ms) {
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
}
function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}
async function harness(file, extras = {}) {
  const slots = [],
    effects = [];
  let cursor = 0,
    dirty = false;
  const api = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= {
        value: typeof initial === 'function' ? initial() : initial,
      };
      return [
        slots[index].value,
        (next) => {
          const value =
            typeof next === 'function' ? next(slots[index].value) : next;
          if (!Object.is(value, slots[index].value)) {
            slots[index].value = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(value) {
      return (slots[cursor++] ??= { current: value });
    },
    useEffect(run, deps) {
      const index = cursor++,
        old = slots[index];
      if (!old || deps.some((dep, i) => !Object.is(dep, old.deps[i])))
        effects.push(() => {
          old?.cleanup?.();
          slots[index] = { deps, cleanup: run() };
        });
    },
    useId: () => 'history',
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
    Fragment: 'fragment',
    ...Object.fromEntries(
      [
        'ChevronDown',
        'ChevronUp',
        'LoaderCircle',
        'Send',
        'X',
        'RotateCcw',
        'Sparkles',
      ].map((name) => [name, name]),
    ),
    ...extras,
  };
  globalThis.__aliceInteractionHarness = api;
  const stub = `data:text/javascript,${encodeURIComponent(`export const {${Object.keys(api).join(',')}} = globalThis.__aliceInteractionHarness; // ${++harnessId}`)}`;
  const source = await readFile(
    new URL(`../components/${file}.tsx`, import.meta.url),
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
      const target = [
        'react',
        'react/jsx-runtime',
        'lucide-react',
        '@/lib/alice-client',
      ].includes(specifier)
        ? stub
        : new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href;
      return `from ${JSON.stringify(target)}`;
    });
  const componentModule = await import(
    `data:text/javascript,${encodeURIComponent(compiled)}`
  );
  return {
    render(props) {
      let output;
      do {
        dirty = false;
        cursor = 0;
        output = Object.values(componentModule)[0](props);
        while (effects.length) effects.shift()();
      } while (dirty);
      return descendants(output);
    },
    dispose() {
      for (const slot of slots) slot?.cleanup?.();
    },
  };
}
try {
  const end = [];
  const expandedChanges = [];
  let failure = false;
  const chat = await harness('alice-chat', {
    async requestAliceReply(_messages, _signal, onText, _lang, events) {
      calls++;
      events.onAttemptStart();
      events.onEmotion({ emotion: 'angry', intensity: 1 });
      // A failed primary attempt can have a different cue from its fallback.
      events.onAttemptStart();
      events.onEmotion({ emotion: 'annoyed', intensity: 0.5 });
      if (failure) throw new Error('upstream');
      onText('到此为止。');
      return '到此为止。';
    },
  });
  const props = {
    lang: 'zh',
    open: true,
    disabled: false,
    onClose() {},
    onExpandedChange: (expanded) => expandedChanges.push(expanded),
    onSpeaking() {},
    onEmotion() {},
    onReplyStart() {},
    onReplyEnd: (...args) => end.push(args),
  };
  let nodes = chat.render(props);
  assert.deepEqual(expandedChanges, [false]);
  nodes
    .find((node) => node.props?.className === 'alice-chat-expand')
    .props.onClick();
  nodes = chat.render(props);
  assert.deepEqual(
    expandedChanges,
    [false, true],
    'The companion can distinguish an open input from expanded history',
  );
  nodes
    .find((node) => node.props?.className === 'alice-chat-expand')
    .props.onClick();
  nodes = chat.render(props);
  const send = async () => {
    nodes
      .find((node) => node.type === 'textarea')
      .props.onChange({ target: { value: '消息' } });
    nodes = chat.render(props);
    nodes
      .find((node) => node.type === 'form')
      .props.onSubmit({ preventDefault() {} });
    await Promise.resolve();
    await Promise.resolve();
    nodes = chat.render(props);
  };
  await send();
  assert.deepEqual(
    end,
    [[false, { emotion: 'annoyed', intensity: 0.5 }]],
    'Only the completed fallback cue is counted once',
  );
  failure = true;
  await send();
  assert.deepEqual(end[1], [true, undefined], 'Failed replies never count');
  props.disabled = true;
  nodes = chat.render(props);
  assert.equal(
    nodes.find((node) => node.type === 'textarea').props.disabled,
    true,
  );
  assert.equal(
    nodes.find((node) => node.props?.type === 'submit').props.disabled,
    true,
  );
  nodes
    .find((node) => node.type === 'form')
    .props.onSubmit({ preventDefault() {} });
  nodes
    .find((node) => node.type === 'textarea')
    .props.onKeyDown({ key: 'Enter', nativeEvent: {}, preventDefault() {} });
  const retry = nodes.find(
    (node) =>
      node.type === 'button' &&
      node.props.children?.some?.((child) => child === '重试'),
  );
  assert.equal(retry.props.disabled, true);
  retry.props.onClick();
  await Promise.resolve();
  assert.equal(
    calls,
    2,
    'Locked submit, Enter and retry cannot start requests',
  );
  props.open = false;
  chat.render(props);
  props.open = true;
  props.lang = 'en';
  assert.equal(
    chat.render(props).find((node) => node.type === 'textarea').props.disabled,
    true,
  );
  chat.dispose();

  let released = 0;
  const arrival = await harness('alice-penguin-arrival');
  const arrivalProps = {
    lang: 'zh',
    reduced: false,
    showBubble: true,
    onComplete: () => released++,
  };
  const bubble = (nodes) =>
    nodes.find(
      (node) =>
        node.props?.className === 'alice-chat-bubble alice-easter-bubble',
    );
  assert(!bubble(arrival.render(arrivalProps)));
  advance(1499);
  assert.equal(released, 0);
  advance(1);
  assert(bubble(arrival.render(arrivalProps)));
  advance(2000);
  document.hidden = true;
  visibility.forEach((fn) => fn());
  advance(60_000);
  assert.equal(released, 0, 'Hidden time cannot expire the penguin lock');
  document.hidden = false;
  visibility.forEach((fn) => fn());
  arrivalProps.lang = 'en';
  arrivalProps.reduced = true;
  arrival.render(arrivalProps);
  advance(2499);
  assert.equal(
    released,
    0,
    'Language and reduced motion do not restart or release the timer',
  );
  advance(1);
  assert.equal(released, 1);
  assert(!bubble(arrival.render(arrivalProps)));
  arrival.dispose();
  const dismissed = await harness('alice-penguin-arrival');
  dismissed.render(arrivalProps);
  advance(1500);
  dismissed
    .render(arrivalProps)
    .find((node) => node.props?.className === 'alice-easter-dismiss')
    .props.onClick();
  assert.equal(released, 2, 'Manual dismissal releases the outfit');
  assert(!bubble(dismissed.render(arrivalProps)));
  dismissed.dispose();
  assert.equal(timers.size, 0);
  assert.equal(visibility.size, 0);
  console.log(
    'PASS: actual chat completion/fallback accounting, disabled input/send/Enter/retry, reopen/language stability, penguin visible-time expiry and dismissal.',
  );
} finally {
  Object.assign(globalThis, native);
  delete globalThis.__aliceInteractionHarness;
}
