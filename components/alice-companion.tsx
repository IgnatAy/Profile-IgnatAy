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
  isAliceEasterEggPreview,
  type AliceModel,
} from '@/models/alice/alice-models';
import type { Language } from '@/lib/profile';
import { AliceChat } from '@/components/alice-chat';
import { AlicePenguinArrival } from '@/components/alice-penguin-arrival';
import { FadedSwap } from '@/components/faded-swap';
import { homeEasterEgg } from '@/models/alice/alice-home-easter-egg';
import {
  getReducedMotion,
  subscribeReducedMotion,
} from '@/lib/browser-preferences';
export const AliceCompanion = memo(function AliceCompanion({
  lang,
  section,
}: {
  lang: Language;
  section: string;
}) {
  const [model, setModel] = useState(() => getDocumentAliceModel(section));
  const [previousSection, setPreviousSection] = useState(section);
  const [preview] = useState(isAliceEasterEggPreview);
  const [shownModel, setShownModel] = useState<AliceModel | null>(null);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const modelShown = useCallback((outfit: AliceModel) => {
    setShownModel(outfit);
    if (outfit === 'penguin') homeEasterEgg.encountered();
  }, []);
  // Adjust before committing a new section, so an old pose is never paired
  // with a new model. The document selector also deduplicates StrictMode renders.
  if (previousSection !== section) {
    setPreviousSection(section);
    const next = getDocumentAliceModel(section);
    if (next !== model) {
      setModel(next);
      setShownModel(null);
    }
  }
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
      {model === 'penguin' && shownModel === model && (
        <AlicePenguinArrival
          key={preview ? section : model}
          lang={lang}
          reduced={reduced}
          showBubble={!chatOpen}
        />
      )}
      <FadedSwap
        value={model}
        className="companion-portraits"
        onShown={modelShown}
      >
        {(outfit, onReady) => (
          <CompanionModel
            model={outfit}
            lang={lang}
            reduced={reduced}
            speaking={chatOpen && speaking}
            onReady={onReady}
            onInteract={() => (chatOpen ? closeChat() : setChatOpen(true))}
          />
        )}
      </FadedSwap>
    </aside>
  );
});

function CompanionModel({
  model,
  lang,
  reduced,
  speaking,
  onReady,
  onInteract,
}: {
  model: AliceModel;
  lang: Language;
  reduced: boolean;
  speaking: boolean;
  onReady: () => void;
  onInteract: () => void;
}) {
  const poses = ALICE_MODELS[model].poses;
  const [pose, setPose] = useState<AlicePose>('idle');
  const [layered, setLayered] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const modelReady = useCallback(() => {
    setReady(true);
    setFailed(false);
    onReady();
  }, [onReady]);
  useEffect(() => {
    if (reduced || !ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (!document.hidden && poses.length > 1 && Math.random() >= 2 / 3)
            setPose((current) => {
              const rest = poses.filter((p) => p !== current);
              return rest[Math.floor(Math.random() * rest.length)] ?? current;
            });
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
  }, [reduced, ready, poses]);
  return (
    <>
      <div className="companion-crop">
        <AliceCharacter
          model={model}
          pose={pose}
          speaking={speaking && !reduced}
          motion={!reduced}
          autonomous={!reduced}
          fullBody={false}
          layered={layered}
          exploded={false}
          strength={1.15}
          blinkSignal={0}
          label={lang === 'en' ? 'Chat with Alice' : '点击和有珠聊天'}
          onInteract={onInteract}
          onReady={modelReady}
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
    </>
  );
}
