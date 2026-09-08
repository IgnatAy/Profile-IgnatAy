'use client';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { AliceCharacter, type AlicePose } from '@/models/alice/alice-character';
import {
  ALICE_MODELS,
  getDocumentAliceModel,
  releaseDocumentAlicePenguin,
  type AliceModel,
} from '@/models/alice/alice-models';
import type { Language } from '@/lib/profile';
import { AliceChat } from '@/components/alice-chat';
import { AlicePenguinArrival } from '@/components/alice-penguin-arrival';
import { FadedSwap } from '@/components/faded-swap';
import { homeEasterEgg } from '@/models/alice/alice-home-easter-egg';
import { aliceAffect, type AliceAffect } from '@/lib/alice-affect';
import { pickAliceIdlePose } from '@/models/alice/alice-expressions';
import { startAliceDwell, ALICE_DWELL_HOLD_MS } from '@/lib/alice-dwell';
import type { AliceEmotionCue } from '@/lib/alice-emotions';
import {
  nextAliceDisplayOrder,
  type AliceDisplayEntry,
} from '@/lib/alice-history';
import {
  pickAliceAppearance,
  type AliceAppearance,
} from '@/models/alice/alice-affect-selection';
import {
  getReducedMotion,
  subscribeReducedMotion,
} from '@/lib/browser-preferences';
const readSections = new Set<string>();
export const AliceCompanion = memo(function AliceCompanion({
  lang,
  section,
}: {
  lang: Language;
  section: string;
}) {
  const [model, setModel] = useState(() => getDocumentAliceModel(section));
  const [previousSection, setPreviousSection] = useState(section);
  const [shownModel, setShownModel] = useState<AliceModel | null>(null);
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistoryExpanded, setChatHistoryExpanded] = useState(false);
  const [easterHistory, setEasterHistory] = useState<AliceDisplayEntry[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const affect = useSyncExternalStore(
    aliceAffect.subscribe,
    aliceAffect.getSnapshot,
    aliceAffect.getServerSnapshot,
  );
  const furious = affect?.source === 'boundary';
  const dwell = useRef<ReturnType<typeof startAliceDwell> | null>(null);
  const canRead = !chatOpen && (affect?.priority ?? 0) <= 40;
  const canReadRef = useRef(canRead);
  useEffect(() => {
    canReadRef.current = canRead;
    dwell.current?.setEnabled(canRead);
  }, [canRead]);
  useEffect(() => {
    if (readSections.has(section)) return;
    const timer = startAliceDwell(() => {
      if (
        aliceAffect.request({
          emotion: 'proud',
          intensity: 0.65,
          source: 'dwell',
          priority: 40,
          holdMs: ALICE_DWELL_HOLD_MS,
        })
      )
        readSections.add(section);
    }, canReadRef.current);
    dwell.current = timer;
    return () => {
      timer.dispose();
      dwell.current = null;
      aliceAffect.leaveSection();
    };
  }, [section]);
  useEffect(() => {
    if (chatOpen)
      aliceAffect.request({
        emotion: 'attentive',
        intensity: 0.45,
        source: 'attention',
        priority: 50,
        holdMs: 2000,
      });
  }, [chatOpen]);
  useEffect(() => () => aliceAffect.reset(), []);
  const replyStart = useCallback(() => {
    aliceAffect.request({
      emotion: 'thinking',
      intensity: 0.5,
      source: 'chat',
      priority: 80,
      holdMs: 0,
      locked: true,
    });
  }, []);
  const replyEmotion = useCallback((cue: AliceEmotionCue) => {
    aliceAffect.request({
      ...cue,
      source: 'chat',
      priority: 80,
      holdMs: 0,
      locked: true,
    });
  }, []);
  const replyEnd = useCallback((failed: boolean, cue?: AliceEmotionCue) => {
    if (failed) aliceAffect.reset();
    else {
      if (cue) aliceAffect.recordChatReaction(cue);
      aliceAffect.finishChat();
    }
  }, []);
  const modelShown = useCallback((outfit: AliceModel) => {
    setShownModel(outfit);
    if (outfit === 'penguin') homeEasterEgg.encountered();
  }, []);
  // Adjust before committing a new section, so an old pose is never paired
  // with a new model. The document selector also deduplicates StrictMode renders.
  if (previousSection !== section || (furious && model !== 'cape')) {
    setPreviousSection(section);
    const next = getDocumentAliceModel(section, furious);
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
  const recordEasterHistory = useCallback(
    (entries: Omit<AliceDisplayEntry, 'id' | 'order'>[]) => {
      setEasterHistory((current) => [
        ...current,
        ...entries.map((entry) => {
          const order = nextAliceDisplayOrder();
          return { ...entry, id: order, order };
        }),
      ]);
    },
    [],
  );
  return (
    <aside
      className="companion"
      data-model={model}
      data-emotion={affect?.emotion ?? 'idle'}
      data-emotion-source={affect?.source}
      aria-label={lang === 'en' ? 'Alice' : '有珠'}
    >
      <AliceChat
        lang={lang}
        displayOnlyEntries={easterHistory}
        open={chatOpen}
        disabled={furious}
        onClose={closeChat}
        onExpandedChange={setChatHistoryExpanded}
        onSpeaking={setSpeaking}
        onEmotion={replyEmotion}
        onReplyStart={replyStart}
        onReplyEnd={replyEnd}
      />
      {model === 'penguin' && shownModel === model && (
        <AlicePenguinArrival
          key={model}
          lang={lang}
          reduced={reduced}
          showBubble={!chatOpen || !chatHistoryExpanded}
          onComplete={releaseDocumentAlicePenguin}
          onHistory={recordEasterHistory}
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
            affect={affect}
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
  affect,
  onReady,
  onInteract,
}: {
  model: AliceModel;
  lang: Language;
  reduced: boolean;
  speaking: boolean;
  affect: AliceAffect | null;
  onReady: () => void;
  onInteract: () => void;
}) {
  const poses = ALICE_MODELS[model].poses;
  const [pose, setPose] = useState<AlicePose>('idle');
  const [appearance, setAppearance] = useState<{
    key: string;
    value: AliceAppearance;
  } | null>(null);
  const affectKey = affect ? `${model}:${affect.id}:${affect.intensity}` : null;
  if (affect && appearance?.key !== affectKey) {
    setAppearance({
      key: affectKey!,
      value: pickAliceAppearance(model, affect, appearance?.value),
    });
  }
  const controlled =
    affect?.source === 'boundary' && model === 'cape'
      ? { pose: 'relaxed' as const, expressionId: '13_11_00' }
      : affect && appearance?.key === affectKey
        ? appearance.value
        : null;
  const displayPose = controlled?.pose ?? pose;
  const [layered, setLayered] = useState(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const modelReady = useCallback(() => {
    setReady(true);
    setFailed(false);
    onReady();
  }, [onReady]);
  useEffect(() => {
    if (reduced || !ready || affect !== null) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (!document.hidden && poses.length > 1 && Math.random() >= 2 / 3)
            setPose((current) => pickAliceIdlePose(model, poses, current));
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
  }, [model, reduced, ready, poses, affect]);
  return (
    <>
      <div className="companion-crop">
        <AliceCharacter
          model={model}
          pose={displayPose}
          expressionId={controlled?.expressionId}
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
