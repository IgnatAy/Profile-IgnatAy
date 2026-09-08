'use client';

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { Sparkles, X } from 'lucide-react';
import type { Language } from '@/lib/profile';
import {
  ALICE_BUBBLE_MS,
  ALICE_EASTER_BUBBLE_DELAY_MS,
} from '@/lib/interaction-timing';
import { startVisibleTimeline } from '@/lib/visible-timeline';

// Original lines inspired by Alice's reserved, flustered composure.
const lines = [
  {
    zh: '……别一直看。只是碰巧换成了这件。',
    en: '…Must you stare? I simply happened to put this on.',
  },
  {
    zh: '这种时候，装作没看见，是最基本的礼貌。',
    en: 'At a time like this, pretending you saw nothing would be polite.',
  },
  {
    zh: '……企鹅？我知道。不需要你特意提醒。',
    en: '…A penguin? I know. You needn’t point it out.',
  },
  {
    zh: '只是稍微试一下。……没有打算让你看见。',
    en: 'I was only trying it on. …You weren’t meant to see.',
  },
  {
    zh: '先等一下。……算了。你继续看你的页面。',
    en: 'Wait a moment. …Never mind. Go back to your page.',
  },
  {
    zh: '没什么特别的。……这些泡泡也与我无关。',
    en: 'There’s nothing unusual about this. …The bubbles have nothing to do with me, either.',
  },
] as const;

let previousLine = -1;
function pickLine() {
  const candidates = lines
    .map((_, index) => index)
    .filter((index) => index !== previousLine);
  previousLine = candidates[Math.floor(Math.random() * candidates.length)];
  return previousLine;
}

const bubbles = Array.from(
  { length: 22 },
  (_, index) =>
    ({
      '--x': `${8 + ((index * 37) % 84)}%`,
      '--size': `${24 + ((index * 23) % 66)}px`,
      '--delay': `${(index % 9) * 0.22}s`,
      '--duration': `${4.2 + (index % 5) * 0.45}s`,
      '--drift': `${((index * 29) % 100) - 50}px`,
    }) as CSSProperties,
);
const sparkles = Array.from(
  { length: 8 },
  (_, index) =>
    ({
      '--x': `${12 + ((index * 31) % 78)}%`,
      '--y': `${16 + ((index * 19) % 65)}%`,
      '--size': `${24 + (index % 3) * 12}px`,
      '--delay': `${(index % 4) * 0.35}s`,
    }) as CSSProperties,
);

const getHidden = () => document.hidden;
function subscribeVisibility(listener: () => void) {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

export function AlicePenguinArrival({
  lang,
  reduced,
  showBubble,
}: {
  lang: Language;
  reduced: boolean;
  showBubble: boolean;
}) {
  const [line] = useState(pickLine);
  const [effectVisible, setEffectVisible] = useState(true);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    getHidden,
    () => false,
  );

  useEffect(() => {
    // The parent mounts this after the portrait has finished fading in.
    return startVisibleTimeline([
      {
        after: ALICE_EASTER_BUBBLE_DELAY_MS,
        run: () => setBubbleVisible(true),
      },
      {
        after: ALICE_EASTER_BUBBLE_DELAY_MS + ALICE_BUBBLE_MS,
        run: () => setBubbleVisible(false),
      },
      { after: 9000, run: () => setEffectVisible(false) },
    ]);
  }, []);

  return (
    <>
      {effectVisible && (
        <div
          className={`alice-penguin-arrival${reduced ? ' is-still' : ''}${hidden ? ' is-paused' : ''}`}
          aria-hidden="true"
        >
          <div className="alice-penguin-aura" />
          {!reduced && (
            <>
              {bubbles.map((style, index) => (
                <span
                  key={index}
                  className="alice-penguin-particle"
                  style={style}
                />
              ))}
              {sparkles.map((style, index) => (
                <span
                  key={index}
                  className="alice-penguin-sparkle"
                  style={style}
                />
              ))}
            </>
          )}
        </div>
      )}
      {bubbleVisible && showBubble && (
        <div className="alice-chat-bubble alice-easter-bubble">
          <div className="alice-chat-bubble-content">
            <output aria-live="polite" aria-atomic="true">
              <span className="alice-easter-label">
                <Sparkles size={14} aria-hidden="true" />
                {lang === 'zh'
                  ? '你发现了企鹅彩蛋'
                  : 'A rare penguin encounter'}
              </span>
              <p>{lines[line][lang]}</p>
            </output>
          </div>
          <button
            type="button"
            className="alice-easter-dismiss"
            aria-label={
              lang === 'zh' ? '收起彩蛋提示' : 'Dismiss Easter egg message'
            }
            onClick={() => setBubbleVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
