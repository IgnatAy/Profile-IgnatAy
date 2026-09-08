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
  const {
    requestAliceReply,
    ALICE_API_URL,
    ALICE_GEMINI_API_URL,
    ALICE_GEMINI_MODEL,
  } = await server.ssrLoadModule('/lib/alice-client.ts');
  const { retainAliceTurns, ALICE_MAX_TURNS } = await server.ssrLoadModule(
    '/lib/alice-history.ts',
  );
  const { ALICE_SYSTEM_PROMPT, getAliceSystemPrompt } =
    await server.ssrLoadModule('/lib/alice-prompt.ts');
  const signal = new AbortController().signal;
  assert.equal(ALICE_MAX_TURNS, 10);
  assert.equal(ALICE_GEMINI_MODEL, 'gemma-4-31b-it');
  assert.match(ALICE_GEMINI_API_URL, /streamGenerateContent\?alt=sse$/);
  assert.equal(getAliceSystemPrompt('zh'), ALICE_SYSTEM_PROMPT);
  assert.equal(getAliceSystemPrompt('en'), ALICE_SYSTEM_PROMPT);
  assert.match(ALICE_SYSTEM_PROMPT, /智源荣誉博士计划/);
  assert.match(ALICE_SYSTEM_PROMPT, /地月导航/);
  assert.match(ALICE_SYSTEM_PROMPT, /Ignat-sama/);

  const messages = Array.from({ length: 25 }, (_, i) => ({
    role: i % 2 ? 'assistant' : 'user',
    content: `${i}`,
  }));
  assert.deepEqual(retainAliceTurns([]), []);
  assert.deepEqual(
    retainAliceTurns(messages.slice(0, 20)),
    messages.slice(0, 20),
  );
  assert.deepEqual(
    retainAliceTurns(messages.slice(0, 21)),
    messages.slice(2, 21),
  );
  assert.deepEqual(retainAliceTurns(messages), messages.slice(6));

  let requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    assert.equal(url, ALICE_GEMINI_API_URL);
    assert.equal(options.mode, 'cors');
    assert.equal(options.credentials, 'omit');
    assert.match(options.headers['x-goog-api-key'], /^AQ\./);
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.generationConfig.thinkingConfig, {
      thinkingLevel: 'minimal',
      includeThoughts: false,
    });
    assert.equal(payload.generationConfig.maxOutputTokens, 256);
    assert.equal(payload.systemInstruction.parts[0].text, ALICE_SYSTEM_PROMPT);
    assert.equal(payload.contents.length, 19);
    assert.equal(payload.contents[0].role, 'user');
    assert.equal(payload.contents[1].role, 'model');
    assert.deepEqual(payload.contents[0].parts, [{ text: '6' }]);
    return Response.json({
      candidates: [
        {
          content: {
            parts: [
              { text: 'hidden', thought: true },
              { text: ' 久远寺有珠。 ' },
            ],
          },
        },
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
  assert.deepEqual(jsonUpdates, ['久远寺有珠。 ']);
  assert.equal(
    requests.length,
    1,
    'Successful Gemini calls never hit fallback',
  );

  const streamResponse = (text) =>
    new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
  const geminiEvents =
    'data: {"candidates":[{"content":{"parts":[{"text":"<|channel>thought\\n"}]}}]}\r\n\r\ndata: {"candidates":[{"content":{"parts":[{"text":"<channel|>有"}]}}]}\n\ndata: {"candidates":[{"content":{"parts":[{"text":"珠。"}]}}]}\n\n';
  globalThis.fetch = async () => streamResponse(geminiEvents);
  const geminiUpdates = [];
  assert.equal(
    await requestAliceReply(messages, signal, (text) =>
      geminiUpdates.push(text),
    ),
    '有珠。',
  );
  assert.deepEqual(geminiUpdates, ['有', '有珠。']);

  requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push(url);
    if (url === ALICE_GEMINI_API_URL)
      return new Response('unavailable', { status: 503 });
    assert.equal(url, ALICE_API_URL);
    assert.match(options.headers.Authorization, /^Bearer ms-/);
    const payload = JSON.parse(options.body);
    assert.equal(payload.enable_thinking, false);
    assert.equal(payload.thinking.type, 'disabled');
    assert.equal(payload.stream, true);
    assert.equal(payload.messages[0].role, 'system');
    assert.equal(payload.messages[0].content, ALICE_SYSTEM_PROMPT);
    assert.deepEqual(payload.messages.slice(1), messages.slice(6));
    return Response.json({
      choices: [
        { message: { content: '备用回答', reasoning_content: 'hidden' } },
      ],
    });
  };
  assert.equal(await requestAliceReply(messages, signal), '备用回答');
  assert.deepEqual(requests, [ALICE_GEMINI_API_URL, ALICE_API_URL]);

  const fallbackEvents =
    'data: {"choices":[{"delta":{"reasoning_content":"hidden"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"备用。"}}]}\n\ndata: [DONE]\n\n';
  let call = 0;
  globalThis.fetch = async () =>
    ++call === 1
      ? new Response('unavailable', { status: 503 })
      : streamResponse(fallbackEvents);
  const fallbackUpdates = [];
  assert.equal(
    await requestAliceReply(messages, signal, (text) =>
      fallbackUpdates.push(text),
    ),
    '备用。',
  );
  assert.deepEqual(fallbackUpdates, ['备用。']);
  assert.equal(call, 2, 'Fallback gets exactly one attempt');

  call = 0;
  const resetUpdates = [];
  globalThis.fetch = async () => {
    call++;
    if (call === 1)
      return streamResponse(
        'data: {"candidates":[{"content":{"parts":[{"text":"半"}]}}]}\n\ndata: invalid\n\n',
      );
    return Response.json({
      choices: [{ message: { content: '完整' } }],
    });
  };
  assert.equal(
    await requestAliceReply(messages, signal, (text) =>
      resetUpdates.push(text),
    ),
    '完整',
  );
  assert.deepEqual(resetUpdates, ['半', '', '完整']);

  call = 0;
  globalThis.fetch = async () => {
    call++;
    return new Response('rate limited', { status: 429 });
  };
  await assert.rejects(requestAliceReply(messages, signal), /rate_limited/);
  assert.equal(call, 2);

  call = 0;
  const abortController = new AbortController();
  globalThis.fetch = async () => {
    call++;
    abortController.abort();
    throw new DOMException('Aborted', 'AbortError');
  };
  await assert.rejects(requestAliceReply(messages, abortController.signal), {
    name: 'AbortError',
  });
  assert.equal(call, 1, 'A visitor abort must not start fallback');

  call = 0;
  globalThis.fetch = async () =>
    ++call === 1
      ? new Response('unavailable', { status: 503 })
      : streamResponse(
          'data: {"choices":[{"delta":{"content":"有珠。"}}]}\n\n',
        );
  await assert.rejects(
    requestAliceReply(messages, signal),
    /incomplete_response/,
  );
  assert.equal(call, 2);

  // Both providers / both transport formats share the prefix parser.
  const emotionReply = ' \n[[AFFECT:proud:0.65]]\n认真看了很久呢。 ';
  for (const fallback of [false, true])
    for (const streamed of [false, true]) {
      const order = [];
      let attempts = 0;
      call = 0;
      globalThis.fetch = async () => {
        if (++call === 1 && fallback) return new Response('', { status: 503 });
        if (!streamed)
          return fallback
            ? Response.json({
                choices: [{ message: { content: emotionReply } }],
              })
            : Response.json({
                candidates: [{ content: { parts: [{ text: emotionReply }] } }],
              });
      const events = emotionReply.split('')
          .map(
            (character) =>
              `data: ${JSON.stringify(
                fallback
                  ? { choices: [{ delta: { content: character } }] }
                  : {
                      candidates: [
                        { content: { parts: [{ text: character }] } },
                      ],
                    },
              )}\n\n`,
          )
          .join('');
        return streamResponse(`${events}${fallback ? 'data: [DONE]\n\n' : ''}`);
      };
      assert.equal(
        await requestAliceReply(
          messages,
          signal,
          (text) => order.push(['text', text]),
          'zh',
          {
            onAttemptStart: () => attempts++,
            onEmotion: (cue) => order.push(['emotion', cue]),
          },
        ),
        '认真看了很久呢。',
      );
      assert.equal(attempts, fallback ? 2 : 1);
      assert.deepEqual(order[0], [
        'emotion',
        { emotion: 'proud', intensity: 0.65 },
      ]);
      assert.equal(order.filter(([type]) => type === 'emotion').length, 1);
      assert(
        order
          .filter(([type]) => type === 'text')
          .every(([, text]) => !text.includes('AFFECT')),
      );
    }

  // Partial provider control markers must never lock the parser in body mode.
  for (const prefix of [
    '<|channel>thought\nsecret<channel|>',
    '<|turn>model',
  ]) {
    const raw = `${prefix}[[AFFECT:proud:0.65]]正文`;
    const events = raw.split('')
      .map(
        (character) =>
          `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: character }] } }] })}\n\n`,
      )
      .join('');
    globalThis.fetch = async () => streamResponse(events);
    const updates = [],
      emotions = [];
    assert.equal(
      await requestAliceReply(
        messages,
        signal,
        (text) => updates.push(text),
        'zh',
        {
          onEmotion: (cue) => emotions.push(cue),
        },
      ),
      '正文',
    );
    assert.deepEqual(updates, ['正文']);
    assert.deepEqual(emotions, [{ emotion: 'proud', intensity: 0.65 }]);
  }

  for (const primaryTail of ['', '未完成正文']) {
    call = 0;
    const order = [];
    globalThis.fetch = async () =>
      ++call === 1
        ? streamResponse(
            `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: `[[AFFECT:angry:0.9]]${primaryTail}` }] } }] })}\n\ndata: invalid\n\n`,
          )
        : Response.json({
            choices: [
              { message: { content: '[[AFFECT:pleased:0.5]]备用正文' } },
            ],
          });
    assert.equal(
      await requestAliceReply(
        messages,
        signal,
        (text) => order.push(text),
        'zh',
        {
          onAttemptStart: () => order.push('start'),
          onEmotion: (cue) => order.push(cue.emotion),
        },
      ),
      '备用正文',
    );
    assert.deepEqual(order, ['start', 'angry', 'start', 'pleased', '备用正文']);
  }
  call = 0;
  globalThis.fetch = async () =>
    ++call === 1
      ? Response.json({
          candidates: [
            { content: { parts: [{ text: '[[AFFECT:proud:0.65]]' }] } },
          ],
        })
      : Response.json({ choices: [{ message: { content: '备用正文' } }] });
  assert.equal(await requestAliceReply(messages, signal), '备用正文');
  assert.equal(call, 2, 'Header without body is an empty reply');

  const delayedAbort = new AbortController();
  const abortedUpdates = [];
  call = 0;
  globalThis.fetch = async () => {
    call++;
    return Response.json({
      candidates: [
        { content: { parts: [{ text: '[[AFFECT:proud:0.65]]正文' }] } },
      ],
    });
  };
  const abortedReply = requestAliceReply(
    messages,
    delayedAbort.signal,
    (text) => abortedUpdates.push(text),
    'zh',
    {
      onEmotion: () => setTimeout(() => delayedAbort.abort(), 10),
    },
  );
  await assert.rejects(abortedReply, { name: 'AbortError' });
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.deepEqual(abortedUpdates, []);
  assert.equal(call, 1, 'Cancelling the reveal never starts a fallback');

  console.log(
    'Alice client checks passed: provider preference, thinking removal including split markers, one fallback, prefix parsing in all transports, emotion before text, stale-attempt cancellation, empty headers, history and abort handling.',
  );
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
