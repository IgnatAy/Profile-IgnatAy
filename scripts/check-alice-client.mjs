import assert from 'node:assert/strict';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
const originalFetch = globalThis.fetch;
try {
  const { requestAliceReply, ALICE_API_URL } = await server.ssrLoadModule(
    '/lib/alice-client.ts',
  );
  const signal = new AbortController().signal;
  const { retainAliceTurns, ALICE_MAX_TURNS } = await server.ssrLoadModule(
    '/lib/alice-history.ts',
  );
  assert.equal(ALICE_MAX_TURNS, 10);
  const messages = Array.from({ length: 25 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: `${i}`,
  }));
  assert.deepEqual(retainAliceTurns([]), []);
  assert.deepEqual(
    retainAliceTurns(messages.slice(0, 20)),
    messages.slice(0, 20),
  );
  // Starting turn 11 removes the oldest complete pair, not half a turn.
  assert.deepEqual(
    retainAliceTurns(messages.slice(0, 21)),
    messages.slice(2, 21),
  );
  assert.deepEqual(
    retainAliceTurns(messages.slice(0, 22)),
    messages.slice(2, 22),
  );
  assert.deepEqual(retainAliceTurns(messages), messages.slice(6));
  globalThis.fetch = async (url, options) => {
    assert.equal(url, ALICE_API_URL);
    assert.equal(options.mode, 'cors');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.signal, signal);
    assert.match(options.headers.Authorization, /^Bearer ms-/);
    const payload = JSON.parse(options.body);
    assert.equal(payload.thinking.type, 'disabled');
    assert.equal(payload.enable_thinking, false);
    assert.equal(payload.stream, true);
    assert.equal(payload.messages.length, 20);
    assert.equal(payload.messages[0].role, 'system');
    assert.match(payload.messages[0].content, /久远寺有珠/);
    assert.deepEqual(payload.messages.slice(1), messages.slice(6));
    return Response.json({
      choices: [
        { message: { content: ' 久远寺有珠。 ', reasoning_content: 'hidden' } },
      ],
    });
  };
  const jsonUpdates = [];
  assert.equal(
    await requestAliceReply(
      messages,
      signal,
      (text) => jsonUpdates.push(text),
      'zh',
    ),
    '久远寺有珠。',
  );
  assert.deepEqual(jsonUpdates, [' 久远寺有珠。 ']);
  const { ALICE_SYSTEM_PROMPT, ALICE_SYSTEM_PROMPT_EN } =
    await server.ssrLoadModule('/lib/alice-prompt.ts');
  assert.doesNotMatch(ALICE_SYSTEM_PROMPT_EN, /\p{Script=Han}/u);
  // Switching the interface changes the system prompt, preserving the history.
  const bilingualHistory = [
    { role: 'user', content: '你是谁？' },
    { role: 'assistant', content: '久远寺有珠。' },
    { role: 'user', content: 'What does Ignat like?' },
  ];
  let expectedPrompt;
  globalThis.fetch = async (_, options) => {
    const payload = JSON.parse(options.body);
    assert.equal(payload.messages[0].content, expectedPrompt);
    assert.equal(
      payload.messages.filter((message) => message.role === 'system').length,
      1,
    );
    assert.deepEqual(payload.messages.slice(1), bilingualHistory);
    return Response.json({ choices: [{ message: { content: 'Reply' } }] });
  };
  for (const language of ['en', 'zh', 'en']) {
    expectedPrompt =
      language === 'en' ? ALICE_SYSTEM_PROMPT_EN : ALICE_SYSTEM_PROMPT;
    await requestAliceReply(bilingualHistory, signal, undefined, language);
  }
  expectedPrompt = ALICE_SYSTEM_PROMPT_EN;
  await requestAliceReply(bilingualHistory, signal);
  const streamResponse = (text) =>
    new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
  const events =
    'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"有珠。"}}]}\n\ndata: [DONE]\n\n';
  globalThis.fetch = async () => streamResponse(events);
  const updates = [];
  assert.equal(
    await requestAliceReply(messages, signal, (text) => updates.push(text)),
    '有珠。',
  );
  assert.deepEqual(updates, ['有珠。']);

  // Observe text before the response ends, with split UTF-8 bytes and SSE lines.
  const encoder = new TextEncoder();
  let source;
  let cancelled = false;
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          source = controller;
        },
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  const incrementalUpdates = [];
  let observeFirstText;
  const firstText = new Promise((resolve) => {
    observeFirstText = resolve;
  });
  let finished = false;
  const incrementalReply = requestAliceReply(messages, signal, (text) => {
    incrementalUpdates.push(text);
    observeFirstText();
  }).then((text) => {
    finished = true;
    return text;
  });
  const firstEvent = encoder.encode(
    'data: {"choices":[{"delta":{"content":"有"}}]}\r\n\r\n',
  );
  for (const byte of firstEvent) source.enqueue(Uint8Array.of(byte));
  let deadline;
  try {
    await Promise.race([
      firstText,
      new Promise((_, reject) => {
        deadline = setTimeout(
          () => reject(new Error('No progress before stream completion')),
          2000,
        );
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
  assert.deepEqual(incrementalUpdates, ['有']);
  assert.equal(finished, false);
  source.enqueue(
    encoder.encode(
      'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\n\ndata: {"choices":[{"delta":{"content":"珠。"}}]}\n\ndata: [DONE]\n\n',
    ),
  );
  // [DONE] finishes the reply even if the server keeps its connection open.
  assert.equal(await incrementalReply, '有珠。');
  assert.deepEqual(incrementalUpdates, ['有', '有珠。']);
  assert.equal(cancelled, true);

  globalThis.fetch = async () => streamResponse(events.trimEnd());
  assert.equal(await requestAliceReply(messages, signal), '有珠。');
  globalThis.fetch = async () =>
    streamResponse(events.replace('data: [DONE]', ''));
  await assert.rejects(
    requestAliceReply(messages, signal),
    /incomplete_response/,
  );

  // A mid-stream abort cancels the body and unblocks the pending read.
  const abortController = new AbortController();
  let abortSource;
  let abortCancelled = false;
  let observeAbortText;
  const abortText = new Promise((resolve) => {
    observeAbortText = resolve;
  });
  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          abortSource = controller;
        },
        cancel() {
          abortCancelled = true;
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  const interruptedReply = requestAliceReply(
    messages,
    abortController.signal,
    observeAbortText,
  );
  abortSource.enqueue(firstEvent);
  await abortText;
  abortController.abort();
  await assert.rejects(interruptedReply, { name: 'AbortError' });
  assert.equal(abortCancelled, true);

  globalThis.fetch = async () =>
    streamResponse('data: {"error":{"message":"provider details"}}\n\n');
  await assert.rejects(requestAliceReply(messages, signal), /upstream/);
  for (const empty of [
    null,
    {},
    { choices: null },
    { choices: [{ message: { content: ' ' } }] },
  ]) {
    globalThis.fetch = async () => Response.json(empty);
    await assert.rejects(requestAliceReply(messages, signal), /empty_response/);
  }
  globalThis.fetch = async () =>
    new Response('provider details', { status: 429 });
  await assert.rejects(requestAliceReply(messages, signal), /rate_limited/);
  globalThis.fetch = async () =>
    new Response('provider details', { status: 401 });
  await assert.rejects(requestAliceReply(messages, signal), /upstream/);
  globalThis.fetch = async () => {
    throw new DOMException('Aborted', 'AbortError');
  };
  await assert.rejects(requestAliceReply(messages, signal), {
    name: 'AbortError',
  });
  console.log(
    'Alice client checks passed: direct CORS request, 10-turn history, incremental UTF-8 streaming, no reasoning text, completion and abort handling.',
  );
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
