import { getAliceSystemPrompt } from './alice-prompt';
import type { Language } from './profile';
import { retainAliceTurns, type ChatMessage } from './alice-history';
import { createAliceReplyParser } from './alice-reply-parser';
import type { AliceEmotionCue } from './alice-emotions';

export type { ChatMessage } from './alice-history';

export const ALICE_GEMINI_MODEL = 'gemma-4-31b-it';
export const ALICE_GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${ALICE_GEMINI_MODEL}:streamGenerateContent?alt=sse`;
export const ALICE_API_URL =
  'https://api-inference.modelscope.cn/v1/chat/completions';

// Intentionally public: the site owner authorized shipping both keys to browsers.
const PUBLIC_GEMINI_API_KEY =
  'AQ.Ab8RN6ITJEh7OK7lPpmVcCYjxBJmmY222fuhMUwyfQzL-mF44A';
const PUBLIC_FALLBACK_API_KEY = 'ms-1006c830-f1c9-4a91-a784-f03a81045e79';
const GEMINI_CONNECTION_TIMEOUT_MS = 8_000;

type ProgressHandler = ((content: string) => void) | undefined;
export type AliceReplyEvents = {
  onEmotion?: (cue: AliceEmotionCue) => void;
  onAttemptStart?: () => void;
};

function cleanGemmaControlText(value: string): string {
  const thoughtStart = '<|channel>thought';
  const thoughtEnd = '<channel|>';
  let content = value;
  let start = content.indexOf(thoughtStart);
  while (start !== -1) {
    const end = content.indexOf(thoughtEnd, start + thoughtStart.length);
    if (end === -1) return content.slice(0, start).trimEnd();
    content = content.slice(0, start) + content.slice(end + thoughtEnd.length);
    start = content.indexOf(thoughtStart);
  }
  content = content
    .replaceAll('<|turn>model', '')
    .replaceAll('<turn|>', '')
    .trimStart();
  // SSE may split a Gemma control token at any character. Do not expose its
  // leading fragment: the affect parser must see monotonic answer text.
  const markers = [thoughtStart, thoughtEnd, '<|turn>model', '<turn|>'];
  for (let size = Math.min(content.length, 24); size > 0; size--) {
    const tail = content.slice(-size);
    if (markers.some((marker) => marker.startsWith(tail)))
      return content.slice(0, -size);
  }
  return content;
}

function assertResponseOk(response: Response): void {
  if (!response.ok)
    throw new Error(response.status === 429 ? 'rate_limited' : 'upstream');
}

function getGeminiText(value: unknown): string {
  const result = value as {
    error?: unknown;
    candidates?: {
      content?: { parts?: { text?: unknown; thought?: boolean }[] };
    }[];
  } | null;
  if (result?.error) throw new Error('upstream');
  return (
    result?.candidates?.[0]?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('') ?? ''
  );
}

async function readGeminiReply(
  response: Response,
  signal: AbortSignal,
  onProgress: ProgressHandler,
): Promise<string> {
  if (!response.headers.get('content-type')?.includes('text/event-stream')) {
    const content = cleanGemmaControlText(getGeminiText(await response.json()));
    signal.throwIfAborted();
    if (!content.trim()) throw new Error('empty_response');
    onProgress?.(content);
    return content.trim();
  }
  if (!response.body) throw new Error('empty_response');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let renderedAnswer = '';
  const readLine = (line: string) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    const text = getGeminiText(JSON.parse(data));
    if (text) {
      answer += text;
      const nextRenderedAnswer = cleanGemmaControlText(answer);
      if (nextRenderedAnswer && nextRenderedAnswer !== renderedAnswer) {
        renderedAnswer = nextRenderedAnswer;
        onProgress?.(renderedAnswer);
      }
    }
  };
  const abort = () => void reader.cancel().catch(() => {});
  signal.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal.throwIfAborted();
      const { value, done } = await reader.read();
      signal.throwIfAborted();
      buffer += decoder.decode(value, { stream: !done });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        readLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) {
        if (buffer) readLine(buffer);
        break;
      }
    }
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  const content = cleanGemmaControlText(answer).trim();
  if (!content) throw new Error('empty_response');
  return content;
}

async function requestGeminiReply(
  messages: ChatMessage[],
  signal: AbortSignal,
  onProgress: ProgressHandler,
  language: Language,
): Promise<string> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  const connectionTimeout = setTimeout(
    () => controller.abort(new Error('provider_timeout')),
    GEMINI_CONNECTION_TIMEOUT_MS,
  );
  try {
    const response = await fetch(ALICE_GEMINI_API_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': PUBLIC_GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: getAliceSystemPrompt(language) }],
        },
        contents: retainAliceTurns(messages).map(({ role, content }) => ({
          role: role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content }],
        })),
        generationConfig: {
          maxOutputTokens: 256,
          thinkingConfig: {
            thinkingLevel: 'minimal',
            includeThoughts: false,
          },
        },
      }),
    });
    clearTimeout(connectionTimeout);
    assertResponseOk(response);
    return await readGeminiReply(response, controller.signal, onProgress);
  } catch (failure) {
    signal.throwIfAborted();
    if (controller.signal.aborted) throw new Error('provider_timeout');
    throw failure;
  } finally {
    clearTimeout(connectionTimeout);
    signal.removeEventListener('abort', abort);
  }
}

async function requestFallbackReply(
  messages: ChatMessage[],
  signal: AbortSignal,
  onProgress: ProgressHandler,
  language: Language,
): Promise<string> {
  const response = await fetch(ALICE_API_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PUBLIC_FALLBACK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V4-Flash-0731',
      messages: [
        { role: 'system', content: getAliceSystemPrompt(language) },
        ...retainAliceTurns(messages).map(({ role, content }) => ({
          role,
          content,
        })),
      ],
      max_tokens: 256,
      stream: true,
      enable_thinking: false,
      thinking: { type: 'disabled' },
    }),
  });
  assertResponseOk(response);
  let content: unknown;
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    if (!response.body) throw new Error('empty_response');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let complete = false;
    const readLine = (line: string) => {
      if (!line.startsWith('data:')) return;
      const data = line.slice(5).trim();
      if (!data) return;
      if (data === '[DONE]') {
        complete = true;
        return;
      }
      const event = JSON.parse(data);
      if (event.error) throw new Error('upstream');
      const delta = event.choices?.[0]?.delta?.content;
      // Only answer text is rendered; never expose reasoning or diagnostics.
      if (typeof delta === 'string' && delta) {
        answer += delta;
        onProgress?.(answer);
      }
    };
    const abort = () => void reader.cancel().catch(() => {});
    signal.addEventListener('abort', abort, { once: true });
    try {
      while (!complete) {
        signal.throwIfAborted();
        const { value, done } = await reader.read();
        signal.throwIfAborted();
        buffer += decoder.decode(value, { stream: !done });
        let newline: number;
        while (!complete && (newline = buffer.indexOf('\n')) !== -1) {
          readLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
        }
        if (done) {
          if (!complete && buffer) readLine(buffer);
          break;
        }
      }
    } finally {
      signal.removeEventListener('abort', abort);
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    if (!complete) throw new Error('incomplete_response');
    content = answer;
  } else {
    const result = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    } | null;
    content = result?.choices?.[0]?.message?.content;
    signal.throwIfAborted();
    if (typeof content === 'string' && content.trim()) onProgress?.(content);
  }
  if (typeof content !== 'string' || !content.trim())
    throw new Error('empty_response');
  return content.trim();
}

export async function requestAliceReply(
  messages: ChatMessage[],
  signal: AbortSignal,
  onProgress?: (content: string) => void,
  language: Language = 'en',
  events: AliceReplyEvents = {},
): Promise<string> {
  let primaryStreamed = false;
  const attempt = async (provider: typeof requestGeminiReply) => {
    signal.throwIfAborted();
    events.onAttemptStart?.();
    let disposed = false;
    let raw = '';
    let latest = '';
    let rendered = '';
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waiting: Promise<void> | undefined;
    let finishWait: (() => void) | undefined;
    const flush = () => {
      if (disposed || signal.aborted || !latest || latest === rendered) return;
      rendered = latest;
      primaryStreamed = true;
      onProgress?.(latest);
    };
    const cancel = () => {
      disposed = true;
      clearTimeout(timer);
      finishWait?.();
    };
    const parser = createAliceReplyParser((cue, tagged) => {
      if (disposed || signal.aborted) return;
      events.onEmotion?.(cue);
      if (tagged) {
        // Give the expression a frame before revealing text, without changing
        // its native face or waiting indefinitely for an uncached texture.
        waiting = new Promise<void>((resolve) => {
          finishWait = resolve;
        });
        timer = setTimeout(() => {
          timer = undefined;
          flush();
          finishWait?.();
        }, 180);
      }
    });
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const answer = await provider(
        messages,
        signal,
        (text) => {
          if (disposed || signal.aborted) return;
          raw = text;
          latest = parser.push(raw);
          if (timer === undefined) flush();
        },
        language,
      );
      signal.throwIfAborted();
      // Provider return strings are trimmed; parse the original cumulative
      // snapshot so offsets from leading whitespace remain valid.
      latest = parser.push(raw || answer, true);
      if (!latest.trim()) throw new Error('empty_response');
      if (waiting) await waiting;
      signal.throwIfAborted();
      flush();
      return latest.trim();
    } finally {
      signal.removeEventListener('abort', cancel);
      cancel();
    }
  };
  try {
    return await attempt(requestGeminiReply);
  } catch {
    signal.throwIfAborted();
    if (primaryStreamed) onProgress?.('');
    // The existing ModelScope route gets exactly one automatic attempt.
    return attempt(requestFallbackReply);
  }
}
