'use client';
import { useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Send,
  X,
  RotateCcw,
} from 'lucide-react';
import type { Language } from '@/lib/profile';
import { requestAliceReply } from '@/lib/alice-client';
import { ALICE_BUBBLE_MS } from '@/lib/interaction-timing';
import { startVisibleTimeline } from '@/lib/visible-timeline';
import {
  ALICE_MAX_TURNS,
  retainAliceTurns,
  type ChatMessage,
} from '@/lib/alice-history';

export function AliceChat({
  lang,
  open,
  onClose,
  onSpeaking,
}: {
  lang: Language;
  open: boolean;
  onClose: () => void;
  onSpeaking: (value: boolean) => void;
}) {
  // Keep this component mounted for the page's lifetime, including while closed.
  // Nothing is persisted across a page refresh or a closed browser tab.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [error, setError] = useState('');
  const historyId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const bubbleTimer = useRef<(() => void) | null>(null);
  const t = (en: string, zh: string) => (lang === 'en' ? en : zh);
  const lastMessage = messages[messages.length - 1];
  const latestReply =
    streamingReply ||
    (lastMessage?.role === 'assistant' ? lastMessage.content : '');
  const turnCount = messages.filter(
    (message) => message.role === 'user',
  ).length;

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  useEffect(() => {
    if (open && !pending && !error) input.current?.focus();
  }, [open, pending, error]);
  useEffect(() => {
    return () => {
      const active = request.current;
      request.current = null;
      active?.abort();
      bubbleTimer.current?.();
      onSpeaking(false);
    };
  }, [onSpeaking]);
  useEffect(() => {
    if (open && expanded)
      log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, streamingReply, pending, error, open, expanded]);
  useEffect(() => {
    bubble.current?.scrollTo({ top: bubble.current.scrollHeight });
  }, [latestReply, pending, error, open, expanded]);

  async function send(retry = false) {
    if (request.current || (!retry && (!draft.trim() || error))) return;
    if (retry && lastMessage?.role !== 'user') return;
    const next = retainAliceTurns(
      retry ? messages : [...messages, { role: 'user', content: draft.trim() }],
    );
    setMessages(next);
    if (!retry) setDraft('');
    setError('');
    setStreamingReply('');
    setBubbleVisible(true);
    setPending(true);
    onSpeaking(false);
    bubbleTimer.current?.();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 50000);
    try {
      const content = await requestAliceReply(
        next,
        controller.signal,
        (text) => {
          if (controller.signal.aborted || request.current !== controller)
            return;
          setStreamingReply(text);
          onSpeaking(true);
        },
        lang,
      );
      if (controller.signal.aborted) return;
      setMessages(retainAliceTurns([...next, { role: 'assistant', content }]));
      setStreamingReply('');
    } catch (failure) {
      if (controller.signal.aborted && request.current !== controller) return;
      setError(
        failure instanceof Error ? failure.message || 'upstream' : 'upstream',
      );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setPending(false);
        onSpeaking(false);
        bubbleTimer.current = startVisibleTimeline([
          { after: ALICE_BUBBLE_MS, run: () => setBubbleVisible(false) },
        ]);
      }
    }
  }

  const replyStatus = (
    <>
      {pending && !streamingReply && (
        <output className="alice-chat-status">
          {t('Waiting for a reply…', '正在等回复…')}
        </output>
      )}
      {error && (
        <div className="alice-chat-error" role="alert">
          <p>
            {error === 'rate_limited'
              ? t(
                  'Too many requests. Please try again shortly.',
                  '请求太频繁了，稍后再试。',
                )
              : t(
                  'The reply did not arrive. Try again.',
                  '回复没能送达，再试一次吧。',
                )}
          </p>
          <button type="button" onClick={() => void send(true)}>
            <RotateCcw size={14} />
            {t('Retry', '重试')}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {open &&
        !expanded &&
        bubbleVisible &&
        (latestReply || pending || error) && (
          <section
            className="alice-chat-bubble"
            aria-live="polite"
            aria-label={t('Alice’s reply', '有珠的回复')}
          >
            <div
              className="alice-chat-bubble-content"
              ref={bubble}
              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Allow keyboard scrolling through long replies.
              tabIndex={0}
            >
              {latestReply && (
                <p className={pending ? 'alice-reply-streaming' : undefined}>
                  {latestReply}
                </p>
              )}
              {replyStatus}
            </div>
          </section>
        )}
      <section
        className="alice-chat"
        hidden={!open}
        aria-label={t('Chat with Alice', '和有珠聊天')}
      >
        <div
          className="alice-chat-history alice-chat-surface"
          id={historyId}
          hidden={!expanded}
          aria-label={t('Conversation history', '对话历史')}
        >
          <header className="alice-chat-header">
            <span>{t('Alice Kuonji', '久远寺有珠')}</span>
            <span className="alice-chat-count">
              {turnCount} / {ALICE_MAX_TURNS} {t('turns', '轮')}
            </span>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                input.current?.focus();
              }}
              aria-label={t('Collapse history', '收起对话历史')}
            >
              <X size={18} />
            </button>
          </header>
          <p className="alice-chat-retention">
            {t(
              `History and AI context keep only the latest ${ALICE_MAX_TURNS} turns. Older turns are removed. Refreshing or closing this page clears the conversation.`,
              `显示历史和 AI 上下文均仅保留最近 ${ALICE_MAX_TURNS} 轮，超出后移除最早对话。刷新或关闭网页后清空。`,
            )}
          </p>
          <div
            className="alice-chat-log"
            ref={log}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Allow keyboard scrolling through conversation history.
            tabIndex={0}
          >
            {!messages.length && (
              <p className="alice-chat-welcome">
                {t('What did you want to ask?', '有什么想问的？')}
              </p>
            )}
            {messages.map((message, index) => (
              <p
                className={`alice-message alice-message-${message.role}`}
                key={index}
              >
                <span className="sr-only">
                  {message.role === 'user'
                    ? t('You: ', '你：')
                    : t('Alice: ', '有珠：')}
                </span>
                {message.content}
              </p>
            ))}
            {streamingReply && (
              <p
                className={`alice-message alice-message-assistant${pending ? ' alice-reply-streaming' : ''}`}
              >
                <span className="sr-only">{t('Alice: ', '有珠：')}</span>
                {streamingReply}
              </p>
            )}
            {replyStatus}
          </div>
        </div>
        <form
          className="alice-chat-form alice-chat-surface"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            ref={input}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            maxLength={2000}
            disabled={pending || !!error}
            aria-label={t('Message Alice', '给有珠的消息')}
            placeholder={t('Message Alice…', '和有珠说点什么…')}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="submit"
            disabled={pending || !!error || !draft.trim()}
            aria-label={t('Send message', '发送消息')}
          >
            {pending ? (
              <LoaderCircle size={18} className="alice-chat-spinner" />
            ) : (
              <Send size={18} />
            )}
          </button>
          <button
            type="button"
            className="alice-chat-expand"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={historyId}
            aria-label={
              expanded
                ? t('Collapse history', '收起对话历史')
                : t('Expand history', '展开对话历史')
            }
            title={
              expanded
                ? t('Collapse history', '收起对话历史')
                : t('Expand history', '展开对话历史')
            }
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </form>
      </section>
    </>
  );
}
