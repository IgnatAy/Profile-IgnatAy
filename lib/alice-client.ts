import { getAliceSystemPrompt } from './alice-prompt';
import type { Language } from './profile';
import { retainAliceTurns, type ChatMessage } from './alice-history';

export type { ChatMessage } from './alice-history';

// Intentionally public: the site owner authorized shipping this key to browsers.
export const ALICE_API_URL =
  'https://api-inference.modelscope.cn/v1/chat/completions';
const PUBLIC_API_KEY = 'ms-1006c830-f1c9-4a91-a784-f03a81045e79';

export async function requestAliceReply(
  messages: ChatMessage[],
  signal: AbortSignal,
  onProgress?: (content: string) => void,
  language: Language = 'en',
): Promise<string> {
  const response = await fetch(ALICE_API_URL, {
    method: 'POST',
    mode: 'cors',
    credentials: 'omit',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PUBLIC_API_KEY}`,
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
  if (!response.ok)
    throw new Error(response.status === 429 ? 'rate_limited' : 'upstream');
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
        // A network chunk can split a UTF-8 character or an SSE line anywhere.
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
