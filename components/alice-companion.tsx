'use client';
import {
  memo,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { AliceCharacter, type AlicePose } from '@/models/alice/alice-character';
import {
  ALICE_MODELS,
  getDocumentAliceModel,
} from '@/models/alice/alice-models';
import type { Language } from '@/lib/profile';
import { AliceChat } from '@/components/alice-chat';
import {
  getReducedMotion,
  subscribeReducedMotion,
} from '@/lib/browser-preferences';
export const AliceCompanion = memo(function AliceCompanion({
  lang,
}: {
  lang: Language;
}) {
  const [model] = useState(getDocumentAliceModel);
  const poses = ALICE_MODELS[model].poses;
  const [pose, setPose] = useState<AlicePose>('idle');
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [layered, setLayered] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: {
              name: string;
              description: string;
              inputSchema: object;
              execute: (input: unknown) => Promise<object>;
            },
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'open_alice_chat',
            description: 'Open the Alice chat input. Does not send a message.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            async execute(input) {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object.');
              if (lifecycle.signal.aborted) throw new Error('Page closed.');
              setChatOpen(true);
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              );
              return { open: true };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser integration. */
    }
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    if (reduced) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (!document.hidden) {
            const behavior = Math.random();
            const changePose = poses.length > 1 && behavior >= 2 / 3;
            if (changePose)
              setPose((current) => {
                const rest = poses.filter((p) => p !== current);
                return rest.length
                  ? rest[Math.floor(Math.random() * rest.length)]
                  : current;
              });
          }
          schedule();
        },
        7000 + Math.random() * 7000,
      );
    };
    const visibility = () => {
      clearTimeout(timer);
      if (!document.hidden) schedule();
    };
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [reduced, poses]);
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setSpeaking(false);
    document
      .querySelector<HTMLButtonElement>('.companion .character-touch')
      ?.focus();
  }, []);
  return (
    <aside
      className="companion"
      data-model={model}
      aria-label={lang === 'en' ? 'Alice' : '有珠'}
    >
      <AliceChat
        lang={lang}
        open={chatOpen}
        onClose={closeChat}
        onSpeaking={setSpeaking}
      />
      <div className="companion-crop">
        <AliceCharacter
          model={model}
          pose={pose}
          speaking={chatOpen && speaking && !reduced}
          motion={!reduced}
          autonomous={!reduced}
          fullBody={false}
          layered={layered}
          exploded={false}
          strength={1.15}
          blinkSignal={0}
          label={lang === 'en' ? 'Chat with Alice' : '点击和有珠聊天'}
          onInteract={() => (chatOpen ? closeChat() : setChatOpen(true))}
          onReady={() => setFailed(false)}
          onError={() => setFailed(true)}
          onLayerError={() => setLayered(false)}
        />
      </div>
      {failed && (
        <span className="sr-only">
          {lang === 'en'
            ? 'Character asset unavailable.'
            : '角色素材暂时不可用。'}
        </span>
      )}
    </aside>
  );
});
